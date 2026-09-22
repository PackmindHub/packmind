import { IGitRepo, CommitFile } from '../../../domain/repositories/IGitRepo';
import { IGithubTokenResolver } from '../../../domain/repositories/IGithubTokenResolver';
import axios, { AxiosInstance } from 'axios';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  GitBranchComparison,
  GitCommit,
  GitFileChange,
  GitFileChangeStatus,
} from '@packmind/types';
import {
  PROVIDER_REQUEST_TIMEOUT_MS,
  withTransientRetry,
} from '../http/withTransientRetry';
import { providerHttpsAgent } from '../http/providerHttpAgent';
import { gitBlobSha } from '@packmind/node-utils';
import { NoFilesToCommitError } from '@packmind/types';
import { GithubApiOperationFailedError } from '../../../domain/errors';

export interface GithubRepositoryOptions {
  owner: string;
  repo: string;
  branch?: string;
}

const origin = 'GithubRepository';

/**
 * GitHub caps a compare response at 300 files and paginates them 100 at a
 * time. Walking all three pages is the most the API will ever give us; beyond
 * that the comparison is reported as truncated.
 */
const COMPARE_FILES_PER_PAGE = 100;
const COMPARE_MAX_PAGES = 3;

export class GithubRepository implements IGitRepo {
  private readonly axiosInstance: AxiosInstance;
  private readonly options: GithubRepositoryOptions;

  constructor(
    private readonly resolver: IGithubTokenResolver,
    options: GithubRepositoryOptions,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('Initializing GithubRepository', {
      owner: options.owner,
      repo: options.repo,
      branch: options.branch,
    });

    this.options = {
      branch: 'main',
      ...options,
    };

    this.axiosInstance = axios.create({
      baseURL: 'https://api.github.com',
      timeout: PROVIDER_REQUEST_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      httpsAgent: providerHttpsAgent,
    });

    this.axiosInstance.interceptors.request.use(async (config) => {
      const token = await resolver.getToken();
      config.headers['Authorization'] = `token ${token}`;
      return config;
    });

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error?.response?.status === 401) {
          await resolver.onUnauthorized();
        }
        return Promise.reject(error);
      },
    );

    this.logger.info('GithubRepository initialized successfully', {
      owner: this.options.owner,
      repo: this.options.repo,
    });
  }

  private getGitMode(permissions?: string): '100644' | '100755' {
    if (!permissions) return '100644';
    return permissions[2] === 'x' ||
      permissions[5] === 'x' ||
      permissions[8] === 'x'
      ? '100755'
      : '100644';
  }

  async commitFiles(
    files: CommitFile[],
    commitMessage: string,
    deleteFiles?: { path: string }[],
  ): Promise<Omit<GitCommit, 'id'>> {
    this.logger.info('Committing files to GitHub repository', {
      fileCount: files.length,
      deleteFileCount: deleteFiles?.length ?? 0,
      owner: this.options.owner,
      repo: this.options.repo,
    });

    if (files.length === 0 && (!deleteFiles || deleteFiles.length === 0)) {
      throw new NoFilesToCommitError();
    }

    try {
      const { owner, repo, branch } = this.options;
      const targetBranch = branch || 'main';

      // One `ref -> commit -> tree` walk answers the whole diff: a recursive
      // tree lists every path with its mode and content SHA, and a blob SHA is
      // a hash of the bytes, so hashing the content to be written decides what
      // changed without downloading anything.
      this.logger.debug('Getting reference to branch', {
        owner,
        repo,
        branch: targetBranch,
      });

      const refResponse = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`,
      );

      const refSha = refResponse.data.object.sha;

      this.logger.debug('Getting commit that reference points to', {
        owner,
        repo,
        refSha,
      });

      const commitResponse = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/git/commits/${refSha}`,
      );

      const baseTreeSha = commitResponse.data.tree.sha;

      const treeResponse = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/git/trees/${baseTreeSha}`,
        { params: { recursive: 1 } },
      );
      const existingBlobs = new Map<string, { mode: string; sha: string }>(
        treeResponse.data.tree
          .filter((item: { type: string }) => item.type === 'blob')
          .map((item: { path: string; mode: string; sha: string }) => [
            item.path,
            { mode: item.mode, sha: item.sha },
          ]),
      );

      // Hashed over the exact bytes to be written, with no normalisation, so
      // a file differing only in its line endings counts as changed.
      const fileDifferenceCheck = files.map((file) => {
        const existingBlob = existingBlobs.get(file.path);

        return {
          path: file.path,
          // Absent from the tree means new.
          hasChanges:
            !existingBlob || existingBlob.sha !== gitBlobSha(file.content),
          hasPermissionsSpecified: !!file.permissions,
        };
      });

      const existingDeleteFiles = deleteFiles
        ? deleteFiles.filter((file) => existingBlobs.has(file.path))
        : [];

      const skippedDeleteCount =
        (deleteFiles?.length ?? 0) - existingDeleteFiles.length;
      if (skippedDeleteCount > 0) {
        this.logger.debug('Skipping deletion of non-existent files', {
          skippedCount: skippedDeleteCount,
          owner,
          repo,
        });
      }

      const hasPermissionChanges = fileDifferenceCheck.some((check, i) => {
        if (!check.hasPermissionsSpecified) return false;
        const existingMode = existingBlobs.get(check.path)?.mode;
        const desiredMode = this.getGitMode(files[i].permissions);
        return existingMode !== desiredMode;
      });
      const hasFileChanges = fileDifferenceCheck.some(
        (file) => file.hasChanges,
      );
      const hasDeletions = existingDeleteFiles.length > 0;
      const hasChanges = hasFileChanges || hasDeletions || hasPermissionChanges;

      if (!hasChanges) {
        this.logger.info('No changes detected, skipping commit', {
          fileCount: files.length,
          deleteFileCount: deleteFiles?.length ?? 0,
          owner,
          repo,
          branch: targetBranch,
        });

        return {
          sha: 'no-changes',
          message: '',
          author: '',
          url: ``,
        };
      }

      this.logger.debug('Preparing tree items', {
        owner,
        repo,
        baseTreeSha,
        fileCount: files.length,
      });

      const treeItems: {
        path: string;
        mode: '100644' | '100755';
        type: 'blob';
        content?: string;
        sha?: null;
      }[] = [];

      for (let i = 0; i < files.length; i++) {
        const hasContentChanges = fileDifferenceCheck[i].hasChanges;
        const existingMode = existingBlobs.get(files[i].path)?.mode;
        const desiredMode = this.getGitMode(files[i].permissions);
        const hasModeChange =
          files[i].permissions && existingMode !== desiredMode;

        if (hasContentChanges || hasModeChange) {
          // With no permissions requested, keep the existing mode rather than
          // resetting a 100755 file to 100644.
          const mode = files[i].permissions
            ? desiredMode
            : existingMode
              ? (existingMode as '100644' | '100755')
              : desiredMode;
          treeItems.push({
            path: files[i].path,
            mode,
            type: 'blob',
            content: files[i].content,
          });
        }
      }

      // `sha: null` is how GitHub is told to delete a path in a tree.
      if (existingDeleteFiles.length > 0) {
        this.logger.info('Adding files for deletion to commit', {
          deleteFileCount: existingDeleteFiles.length,
          skippedCount: skippedDeleteCount,
          owner,
          repo,
        });

        for (const file of existingDeleteFiles) {
          treeItems.push({
            path: file.path,
            mode: '100644',
            type: 'blob',
            sha: null,
          });
        }
      }

      this.logger.debug('Creating new tree with all file changes', {
        owner,
        repo,
        baseTreeSha,
        treeItemCount: treeItems.length,
      });

      const createTreeResponse = await this.axiosInstance.post(
        `/repos/${owner}/${repo}/git/trees`,
        {
          base_tree: baseTreeSha,
          tree: treeItems,
        },
      );

      const newTreeSha = createTreeResponse.data.sha;

      this.logger.debug('Creating new commit pointing to the new tree', {
        owner,
        repo,
        newTreeSha,
        parentCommitSha: refSha,
      });

      const createCommitResponse = await this.axiosInstance.post(
        `/repos/${owner}/${repo}/git/commits`,
        {
          message: commitMessage,
          tree: newTreeSha,
          parents: [refSha],
        },
      );

      const newCommitSha = createCommitResponse.data.sha;

      this.logger.debug('Updating reference to point to the new commit', {
        owner,
        repo,
        branch: targetBranch,
        newCommitSha,
      });

      await this.axiosInstance.patch(
        `/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`,
        {
          sha: newCommitSha,
          force: false,
        },
      );

      const commitInfo = {
        sha: createCommitResponse.data.sha,
        message: commitMessage,
        author:
          createCommitResponse.data.author?.email ||
          createCommitResponse.data.committer?.email ||
          'unknown',
        url:
          createCommitResponse.data.html_url ||
          `https://github.com/${owner}/${repo}/commit/${createCommitResponse.data.sha}`,
      };

      this.logger.info('Files committed successfully in a single commit', {
        fileCount: files.length,
        deleteFileCount: deleteFiles?.length ?? 0,
        owner,
        repo,
        branch: targetBranch,
        commitSha: commitInfo.sha,
      });

      return commitInfo;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to commit files to GitHub repository', {
        fileCount: files.length,
        deleteFileCount: deleteFiles?.length ?? 0,
        owner: this.options.owner,
        repo: this.options.repo,
        error: errorMessage,
      });
      throw new GithubApiOperationFailedError('commit files to GitHub', error, {
        owner: this.options.owner,
        repo: this.options.repo,
      });
    }
  }

  async createBranchFromBase(targetBranch: string): Promise<void> {
    const { owner, repo } = this.options;
    const baseBranch = this.options.branch || 'main';

    this.logger.info('Ensuring branch exists on GitHub repository', {
      owner,
      repo,
      baseBranch,
      targetBranch,
    });

    try {
      await this.axiosInstance.get(
        `/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`,
      );

      this.logger.debug('Target branch already exists, skipping creation', {
        owner,
        repo,
        targetBranch,
      });
      return;
    } catch (error) {
      const status = this.extractHttpStatus(error);
      if (status !== 404) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to probe target branch existence on GitHub', {
          owner,
          repo,
          targetBranch,
          error: errorMessage,
        });
        throw new GithubApiOperationFailedError(
          `ensure branch '${targetBranch}' on GitHub`,
          error,
          { owner, repo, branch: targetBranch },
        );
      }
      // 404 is the only tolerated failure: the branch is simply missing.
      this.logger.debug('Target branch missing, will create from base', {
        owner,
        repo,
        baseBranch,
        targetBranch,
      });
    }

    let baseSha: string;
    try {
      const baseRefResponse = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/git/refs/heads/${baseBranch}`,
      );
      baseSha = baseRefResponse.data.object.sha;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch base branch ref on GitHub', {
        owner,
        repo,
        baseBranch,
        error: errorMessage,
      });
      throw new GithubApiOperationFailedError(
        `fetch base branch '${baseBranch}' on GitHub`,
        error,
        { owner, repo, branch: baseBranch },
      );
    }

    try {
      await this.axiosInstance.post(`/repos/${owner}/${repo}/git/refs`, {
        ref: `refs/heads/${targetBranch}`,
        sha: baseSha,
      });

      this.logger.info('Created target branch on GitHub', {
        owner,
        repo,
        baseBranch,
        targetBranch,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to create target branch on GitHub', {
        owner,
        repo,
        baseBranch,
        targetBranch,
        error: errorMessage,
      });
      throw new GithubApiOperationFailedError(
        `create branch '${targetBranch}' on GitHub`,
        error,
        { owner, repo, branch: targetBranch },
      );
    }
  }

  async deleteBranch(targetBranch: string): Promise<void> {
    const { owner, repo } = this.options;

    this.logger.info('Deleting branch on GitHub repository', {
      owner,
      repo,
      targetBranch,
    });

    try {
      await this.axiosInstance.delete(
        `/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`,
      );

      this.logger.info('Deleted branch on GitHub', {
        owner,
        repo,
        targetBranch,
      });
    } catch (error) {
      const status = this.extractHttpStatus(error);
      if (status === 404 || status === 422) {
        this.logger.debug('Branch already absent on GitHub, skipping delete', {
          owner,
          repo,
          targetBranch,
        });
        return;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to delete branch on GitHub', {
        owner,
        repo,
        targetBranch,
        error: errorMessage,
      });
      throw new GithubApiOperationFailedError(
        `delete branch '${targetBranch}' on GitHub`,
        error,
        { owner, repo, branch: targetBranch },
      );
    }
  }

  async openOrUpdatePullRequest(command: {
    head: string;
    title: string;
    body?: string;
  }): Promise<{ url: string; number: number; wasCreated: boolean }> {
    const { owner, repo } = this.options;
    const baseBranch = this.options.branch || 'main';
    const { head, title, body } = command;

    this.logger.info('Ensuring rolling pull request on GitHub repository', {
      owner,
      repo,
      head,
      base: baseBranch,
    });

    // An open PR gets its title and body refreshed rather than keeping stale
    // text: the rolling sync PR recomputes its description on every publish.
    const existing = await this.findOpenPullRequestForBase(head, baseBranch);
    if (existing) {
      this.logger.debug('Existing open pull request found, updating it', {
        owner,
        repo,
        head,
        base: baseBranch,
        number: existing.number,
      });
      await this.updatePullRequest(existing.number, title, body);
      return { url: existing.url, number: existing.number, wasCreated: false };
    }

    // A concurrent creator makes GitHub answer 422 "A pull request already
    // exists", which is handled by re-running the lookup below.
    try {
      const createResponse = await this.axiosInstance.post(
        `/repos/${owner}/${repo}/pulls`,
        {
          title,
          head,
          base: baseBranch,
          body,
        },
      );

      this.logger.info('Created pull request on GitHub', {
        owner,
        repo,
        head,
        base: baseBranch,
        number: createResponse.data.number,
      });

      return {
        url: createResponse.data.html_url,
        number: createResponse.data.number,
        wasCreated: true,
      };
    } catch (error) {
      if (this.isPullRequestAlreadyExistsError(error)) {
        this.logger.debug(
          'GitHub reported PR already exists, re-running lookup',
          { owner, repo, head, base: baseBranch },
        );
        const racedExisting = await this.findOpenPullRequestForBase(
          head,
          baseBranch,
        );
        if (racedExisting) {
          return {
            url: racedExisting.url,
            number: racedExisting.number,
            wasCreated: false,
          };
        }
        // Falls through to the generic error when even the post-race lookup
        // finds nothing.
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to open pull request on GitHub', {
        owner,
        repo,
        head,
        base: baseBranch,
        error: errorMessage,
      });
      throw new GithubApiOperationFailedError(
        `open pull request on GitHub for '${head}' -> '${baseBranch}'`,
        error,
        { owner, repo, branch: head },
      );
    }
  }

  /**
   * Deliberately non-throwing: the caller already holds a usable PR URL, and a
   * slightly stale description beats losing that URL to a failed PATCH.
   */
  private async updatePullRequest(
    pullNumber: number,
    title: string,
    body?: string,
  ): Promise<void> {
    const { owner, repo } = this.options;
    try {
      await this.axiosInstance.patch(
        `/repos/${owner}/${repo}/pulls/${pullNumber}`,
        body === undefined ? { title } : { title, body },
      );
      this.logger.debug('Updated pull request on GitHub', {
        owner,
        repo,
        number: pullNumber,
      });
    } catch (error) {
      this.logger.warn('Failed to update pull request on GitHub', {
        owner,
        repo,
        number: pullNumber,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async compareBranches(
    base: string,
    head: string,
  ): Promise<GitBranchComparison> {
    const { owner, repo } = this.options;
    const files: GitFileChange[] = [];
    let truncated = false;

    try {
      for (let page = 1; page <= COMPARE_MAX_PAGES; page++) {
        const response = await this.axiosInstance.get(
          `/repos/${owner}/${repo}/compare/${base}...${head}`,
          { params: { per_page: COMPARE_FILES_PER_PAGE, page } },
        );

        const pageFiles: Array<{
          filename: string;
          status: string;
          previous_filename?: string;
        }> = Array.isArray(response.data?.files) ? response.data.files : [];

        for (const file of pageFiles) {
          files.push(...this.toFileChanges(file));
        }

        if (pageFiles.length < COMPARE_FILES_PER_PAGE) {
          break;
        }
        // A full last page means GitHub may still be holding files back.
        truncated = page === COMPARE_MAX_PAGES;
      }

      this.logger.debug('Compared branches on GitHub', {
        owner,
        repo,
        base,
        head,
        fileCount: files.length,
        truncated,
      });

      return { files, truncated };
    } catch (error) {
      const status = this.extractHttpStatus(error);
      if (status === 404) {
        // One of the two refs does not exist — nothing to compare.
        this.logger.debug('Branch comparison target missing on GitHub', {
          owner,
          repo,
          base,
          head,
        });
        return { files: [], truncated: false };
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to compare branches on GitHub', {
        owner,
        repo,
        base,
        head,
        error: errorMessage,
      });
      throw new GithubApiOperationFailedError(
        `compare '${base}'...'${head}' on GitHub`,
        error,
        { owner, repo },
      );
    }
  }

  /**
   * Map one GitHub compare entry to our normalized changes. A rename becomes
   * two entries (old path removed, new path added) so callers reasoning about
   * per-directory contents see the file leave one place and arrive in another.
   */
  private toFileChanges(file: {
    filename: string;
    status: string;
    previous_filename?: string;
  }): GitFileChange[] {
    if (file.status === 'renamed') {
      const changes: GitFileChange[] = [
        { path: file.filename, status: 'added' },
      ];
      if (file.previous_filename) {
        changes.push({ path: file.previous_filename, status: 'removed' });
      }
      return changes;
    }

    const statusMap: Record<string, GitFileChangeStatus> = {
      added: 'added',
      copied: 'added',
      removed: 'removed',
      modified: 'modified',
      changed: 'modified',
      unchanged: 'modified',
    };
    return [
      { path: file.filename, status: statusMap[file.status] ?? 'modified' },
    ];
  }

  public async findOpenPullRequest(
    head: string,
  ): Promise<{ url: string; number: number } | null> {
    const baseBranch = this.options.branch || 'main';
    return this.findOpenPullRequestForBase(head, baseBranch);
  }

  public async checkRepositoryExists(): Promise<{
    exists: boolean;
    reason?: 'auth_failed' | 'repo_not_found' | 'network_transient';
  }> {
    const { owner, repo } = this.options;
    try {
      await this.axiosInstance.get(`/repos/${owner}/${repo}`);
      return { exists: true };
    } catch (error) {
      const status = this.extractHttpStatus(error);
      if (status === 401 || status === 403) {
        return { exists: false, reason: 'auth_failed' };
      }
      if (status === 404) {
        return { exists: false, reason: 'repo_not_found' };
      }
      return { exists: false, reason: 'network_transient' };
    }
  }

  private async findOpenPullRequestForBase(
    head: string,
    base: string,
  ): Promise<{ url: string; number: number } | null> {
    const { owner, repo } = this.options;
    const response = await this.axiosInstance.get(
      `/repos/${owner}/${repo}/pulls`,
      {
        params: {
          head: `${owner}:${head}`,
          base,
          state: 'open',
        },
      },
    );

    if (Array.isArray(response.data) && response.data.length > 0) {
      const first = response.data[0];
      return { url: first.html_url, number: first.number };
    }
    return null;
  }

  private isPullRequestAlreadyExistsError(error: unknown): boolean {
    if (this.extractHttpStatus(error) !== 422) {
      return false;
    }
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'data' in error.response
    ) {
      const data = (error.response as { data: unknown }).data;
      const serialized =
        typeof data === 'string' ? data : JSON.stringify(data ?? '');
      return /pull request already exists/i.test(serialized);
    }
    return false;
  }

  private extractHttpStatus(error: unknown): number | undefined {
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'status' in error.response &&
      typeof (error.response as { status: unknown }).status === 'number'
    ) {
      return (error.response as { status: number }).status;
    }
    return undefined;
  }

  async getFileOnRepo(
    path: string,
    branch?: string,
  ): Promise<{
    sha: string;
    content: string;
    execute_filemode?: boolean;
  } | null> {
    const { owner, repo } = this.options;
    const targetBranch = branch || this.options.branch;

    try {
      this.logger.debug('Fetching file from repository', {
        path,
        owner,
        repo,
        branch: targetBranch,
      });

      const response = await withTransientRetry(
        () =>
          this.axiosInstance.get(`/repos/${owner}/${repo}/contents/${path}`, {
            params: { ref: targetBranch },
          }),
        { logger: this.logger, label: `contents ${owner}/${repo}/${path}` },
      );

      if (response.data && response.data.sha) {
        this.logger.debug('File found in repository', {
          path,
          sha: response.data.sha,
        });
        return {
          sha: response.data.sha,
          content: response.data.content || '',
        };
      }

      return null;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'status' in error.response &&
        error.response.status === 404
      ) {
        this.logger.debug('File not found in repository', {
          path,
          owner,
          repo,
          branch: targetBranch,
        });
        return null;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch file from repository', {
        path,
        owner,
        repo,
        branch: targetBranch,
        error: errorMessage,
      });
      throw error;
    }
  }

  async listDirectoriesOnRepo(
    name: string,
    owner: string,
    branch: string,
    path?: string,
  ): Promise<string[]> {
    this.logger.info('Listing available repositories from GitHub', {
      name,
      owner,
      branch,
      path: path || '/',
    });

    try {
      const branchResponse = await this.axiosInstance.get(
        `/repos/${owner}/${name}/branches/${branch}`,
      );

      const treeSha = branchResponse.data.commit.commit.tree.sha;

      const treeResponse = await this.axiosInstance.get(
        `/repos/${owner}/${name}/git/trees/${treeSha}`,
        {
          params: { recursive: 1 },
        },
      );

      let directories = treeResponse.data.tree
        .filter((item: { type: string }) => item.type === 'tree')
        .map((item: { path: string }) => item.path);

      // GitHub returns entries from within the requested path, so the prefix
      // has to be re-applied to report them as repository paths.
      if (path && path !== '/') {
        const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
        const pathPrefix = normalizedPath.endsWith('/')
          ? normalizedPath
          : `${normalizedPath}/`;

        directories = directories
          .filter((dirPath: string) => dirPath.startsWith(pathPrefix))
          .map((dirPath: string) => dirPath.slice(pathPrefix.length))
          .filter(
            (relativePath: string) => relativePath && relativePath.length > 0,
          );
      }

      this.logger.info('Successfully retrieved directories', {
        owner,
        repo: name,
        branch,
        path: path || '/',
        directoryCount: directories.length,
        truncated: treeResponse.data.truncated || false,
      });

      if (treeResponse.data.truncated) {
        this.logger.warn(
          'Tree response was truncated by GitHub API - some directories may be missing',
          {
            owner,
            repo: name,
            branch,
          },
        );
      }

      return directories;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to list available repositories from GitHub', {
        name,
        owner,
        branch,
        error: errorMessage,
      });
      throw new GithubApiOperationFailedError(
        'list repositories from GitHub',
        error,
        { owner, repo: name, branch },
      );
    }
  }

  async checkDirectoryExists(
    directoryPath: string,
    branch: string,
  ): Promise<boolean> {
    const { owner, repo } = this.options;

    try {
      // The contents API answers with an array for a directory and a single
      // object for a file, which is the whole test below.
      const response = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/contents/${directoryPath}`,
        { params: { ref: branch } },
      );

      if (Array.isArray(response.data)) {
        return true;
      }

      return false;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'status' in error.response &&
        error.response.status === 404
      ) {
        return false;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to check directory existence in repository', {
        path: directoryPath,
        owner,
        repo,
        branch: branch,
        error: errorMessage,
      });
      throw error;
    }
  }

  async listFilesInDirectory(
    path: string,
    branch: string,
  ): Promise<{ path: string }[]> {
    const { owner, repo } = this.options;

    try {
      const refResponse = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/git/ref/heads/${branch}`,
      );
      const refSha = refResponse.data.object.sha;

      const commitResponse = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/git/commits/${refSha}`,
      );
      const baseTreeSha = commitResponse.data.tree.sha;

      const treeResponse = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/git/trees/${baseTreeSha}`,
        { params: { recursive: 1 } },
      );

      const normalizedPath = path.endsWith('/') ? path : `${path}/`;

      const files = treeResponse.data.tree
        .filter(
          (item: { type: string; path?: string }) =>
            item.type === 'blob' && item.path?.startsWith(normalizedPath),
        )
        .map((item: { path: string }) => ({ path: item.path }));

      this.logger.debug('Listed files in directory', {
        path,
        branch,
        fileCount: files.length,
      });

      return files;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to list files in directory', {
        path,
        owner,
        repo,
        branch,
        error: errorMessage,
      });
      return [];
    }
  }

  async listFilesInDirectories(
    paths: string[],
    branch: string,
  ): Promise<{ path: string }[]> {
    const { owner, repo } = this.options;

    if (paths.length === 0) {
      return [];
    }

    try {
      // One `ref -> commit -> tree` walk for every path, not one per path:
      // the recursive tree already covers the whole repository.
      const refResponse = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/git/ref/heads/${branch}`,
      );
      const refSha = refResponse.data.object.sha;

      const commitResponse = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/git/commits/${refSha}`,
      );
      const baseTreeSha = commitResponse.data.tree.sha;

      const treeResponse = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/git/trees/${baseTreeSha}`,
        { params: { recursive: 1 } },
      );

      const blobPaths: string[] = treeResponse.data.tree
        .filter(
          (item: { type: string; path?: string }) =>
            item.type === 'blob' && !!item.path,
        )
        .map((item: { path: string }) => item.path);

      // Filtered per path rather than once against all prefixes, so the
      // result keeps the order and the duplicates that calling the singular
      // form for each path produces.
      const files = paths.flatMap((path) => {
        const normalizedPath = path.endsWith('/') ? path : `${path}/`;
        return blobPaths
          .filter((blobPath) => blobPath.startsWith(normalizedPath))
          .map((blobPath) => ({ path: blobPath }));
      });

      this.logger.debug('Listed files in directories', {
        directoryCount: paths.length,
        branch,
        fileCount: files.length,
      });

      return files;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to list files in directories', {
        directoryCount: paths.length,
        owner,
        repo,
        branch,
        error: errorMessage,
      });
      // An unreachable or missing tree means "nothing to expand", not a
      // failed publish.
      return [];
    }
  }
}
