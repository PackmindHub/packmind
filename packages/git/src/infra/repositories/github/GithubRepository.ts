import { IGitRepo, CommitFile } from '../../../domain/repositories/IGitRepo';
import { IGithubTokenResolver } from '../../../domain/repositories/IGithubTokenResolver';
import axios, { AxiosInstance } from 'axios';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { GitCommit } from '@packmind/types';

export interface GithubRepositoryOptions {
  owner: string;
  repo: string;
  branch?: string;
}

const origin = 'GithubRepository';

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
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    // Inject token from resolver on every request
    this.axiosInstance.interceptors.request.use(async (config) => {
      const token = await resolver.getToken();
      config.headers['Authorization'] = `token ${token}`;
      return config;
    });

    // Fire onUnauthorized hook on 401 responses
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
      throw new Error('No files to commit');
    }

    try {
      const { owner, repo, branch } = this.options;
      const targetBranch = branch || 'main';

      // Step 1: Check if there are any actual changes to commit (file modifications or permission changes)
      const fileDifferenceCheck = await Promise.all(
        files.map(async (file) => {
          const existingFile = await this.getFileOnRepo(
            file.path,
            targetBranch,
          );
          if (!existingFile) {
            // File doesn't exist, so it's a new file
            return { path: file.path, hasChanges: true };
          } else {
            // File exists, check if content is different
            const existingContent = Buffer.from(
              existingFile.content,
              'base64',
            ).toString('utf-8');
            return {
              path: file.path,
              hasChanges: existingContent !== file.content,
              hasPermissionsSpecified: !!file.permissions,
            };
          }
        }),
      );

      // Step 2: Get the reference to the current branch
      this.logger.debug('Getting reference to branch', {
        owner,
        repo,
        branch: targetBranch,
      });

      const refResponse = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`,
      );

      const refSha = refResponse.data.object.sha;

      // Step 3: Get the commit that the reference points to
      this.logger.debug('Getting commit that reference points to', {
        owner,
        repo,
        refSha,
      });

      const commitResponse = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/git/commits/${refSha}`,
      );

      const baseTreeSha = commitResponse.data.tree.sha;

      // Step 4: Fetch full tree to know which files exist (for filtering deletions)
      const treeResponse = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/git/trees/${baseTreeSha}`,
        { params: { recursive: 1 } },
      );
      const existingPathsWithModes = new Map<string, string>(
        treeResponse.data.tree
          .filter((item: { type: string }) => item.type === 'blob')
          .map((item: { path: string; mode: string }) => [
            item.path,
            item.mode,
          ]),
      );

      // Step 5: Filter delete files to only those that exist in the repo
      const existingDeleteFiles = deleteFiles
        ? deleteFiles.filter((file) => existingPathsWithModes.has(file.path))
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

      // Step 6: Check if there are any changes to commit (file modifications, permission changes, or deletions)
      // For permission changes, compare the existing tree mode with the desired mode
      const hasPermissionChanges = fileDifferenceCheck.some((check, i) => {
        if (!check.hasPermissionsSpecified) return false;
        const existingMode = existingPathsWithModes.get(check.path);
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

      // Step 7: Prepare tree items - only add files with actual changes
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

      // Add files that have content changes or permission changes
      for (let i = 0; i < files.length; i++) {
        const hasContentChanges = fileDifferenceCheck[i].hasChanges;
        const existingMode = existingPathsWithModes.get(files[i].path);
        const desiredMode = this.getGitMode(files[i].permissions);
        const hasModeChange =
          files[i].permissions && existingMode !== desiredMode;

        if (hasContentChanges || hasModeChange) {
          // When permissions is not specified, preserve the existing mode
          // to avoid accidentally resetting 100755 files to 100644
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

      // Add delete items to tree (sha: null tells GitHub to delete the file)
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

      // Step 8: Create a new tree with all file changes
      this.logger.debug('Creating new tree with all file changes', {
        owner,
        repo,
        baseTreeSha,
        treeItemCount: treeItems.length,
      });

      // Create a new tree with all file changes
      const createTreeResponse = await this.axiosInstance.post(
        `/repos/${owner}/${repo}/git/trees`,
        {
          base_tree: baseTreeSha,
          tree: treeItems,
        },
      );

      const newTreeSha = createTreeResponse.data.sha;

      // Step 9: Create a new commit pointing to the new tree
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

      // Step 10: Update the reference to point to the new commit
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

      // Extract commit information from GitHub API response
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
      throw new Error(`Failed to commit files to GitHub: ${errorMessage}`);
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

    // Step 1: Check if the target branch already exists. If GitHub returns
    // 2xx, the branch is present and no work is needed.
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
        throw new Error(
          `Failed to ensure branch '${targetBranch}' on GitHub: ${errorMessage}`,
        );
      }
      // 404 -> branch missing, proceed to create it from the base branch.
      this.logger.debug('Target branch missing, will create from base', {
        owner,
        repo,
        baseBranch,
        targetBranch,
      });
    }

    // Step 2: Fetch the base branch SHA so we know where to fork from.
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
      throw new Error(
        `Failed to fetch base branch '${baseBranch}' on GitHub: ${errorMessage}`,
      );
    }

    // Step 3: Create the target branch ref pointing at the base SHA.
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
      throw new Error(
        `Failed to create branch '${targetBranch}' on GitHub: ${errorMessage}`,
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

    // Step 1: Look up any existing open PR matching head -> base.
    const existing = await this.findOpenPullRequestForBase(head, baseBranch);
    if (existing) {
      this.logger.debug('Existing open pull request found, skipping creation', {
        owner,
        repo,
        head,
        base: baseBranch,
        number: existing.number,
      });
      return { url: existing.url, number: existing.number, wasCreated: false };
    }

    // Step 2: Create a new PR. GitHub may race a concurrent creator and
    // respond with a 422 "A pull request already exists" — in that case we
    // re-run the lookup and surface the existing PR.
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
        // Fallthrough: fall back to a generic error if the post-race lookup
        // still finds nothing (extremely unlikely, but defensive).
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
      throw new Error(
        `Failed to open pull request on GitHub for '${head}' -> '${baseBranch}': ${errorMessage}`,
      );
    }
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

      const response = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/contents/${path}`,
        { params: { ref: targetBranch } },
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
      // If we get a 404, the file doesn't exist
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

      // Re-throw other errors
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
      // Step 1: Get the SHA of the tree from the branch
      const branchResponse = await this.axiosInstance.get(
        `/repos/${owner}/${name}/branches/${branch}`,
      );

      const treeSha = branchResponse.data.commit.commit.tree.sha;

      // Step 2: Get the entire tree recursively and filter for directories
      const treeResponse = await this.axiosInstance.get(
        `/repos/${owner}/${name}/git/trees/${treeSha}`,
        {
          params: { recursive: 1 },
        },
      );

      let directories = treeResponse.data.tree
        .filter((item: { type: string }) => item.type === 'tree')
        .map((item: { path: string }) => item.path);

      // If a specific path is provided (and not root "/"), show all subdirectories recursively
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
      throw new Error(
        `Failed to list repositories from GitHub: ${errorMessage}`,
      );
    }
  }

  async checkDirectoryExists(
    directoryPath: string,
    branch: string,
  ): Promise<boolean> {
    const { owner, repo } = this.options;

    try {
      // Use GitHub's contents API to check if the directory exists
      // For directories, GitHub returns an array of directory contents
      const response = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/contents/${directoryPath}`,
        { params: { ref: branch } },
      );

      // If we get a successful response with an array, it's a directory
      if (Array.isArray(response.data)) {
        return true;
      }

      // If we get a single object, it's a file, not a directory
      return false;
    } catch (error) {
      // If we get a 404, the directory doesn't exist
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

      // Re-throw other errors
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
      // Get the branch ref to find the tree SHA
      const refResponse = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/git/ref/heads/${branch}`,
      );
      const refSha = refResponse.data.object.sha;

      // Get the commit to find the tree SHA
      const commitResponse = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/git/commits/${refSha}`,
      );
      const baseTreeSha = commitResponse.data.tree.sha;

      // Fetch full tree recursively
      const treeResponse = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/git/trees/${baseTreeSha}`,
        { params: { recursive: 1 } },
      );

      // Normalize path to ensure it ends with /
      const normalizedPath = path.endsWith('/') ? path : `${path}/`;

      // Filter for files (blobs) under the given path
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
      // Return empty array if directory doesn't exist
      return [];
    }
  }
}
