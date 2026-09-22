import { IGitRepo, CommitFile } from '../../../domain/repositories/IGitRepo';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { PackmindLogger } from '@packmind/logger';
import { GitBranchComparison, GitCommit, GitFileChange } from '@packmind/types';
import { GitlabRepositoryOptions } from './types';
import { extractNextPageUrl } from './linkHeaderUtils';
import {
  PROVIDER_REQUEST_TIMEOUT_MS,
  withTransientRetry,
} from '../http/withTransientRetry';
import { gitBlobSha } from '@packmind/node-utils';
import { providerHttpsAgent } from '../http/providerHttpAgent';
import {
  GitRemoteAccessForbiddenError,
  GitRemoteRepositoryNotFoundError,
  NoFilesToCommitError,
} from '@packmind/types';
import { gitlabRateLimitedError } from '../http/gitlabRateLimit';
import {
  GitlabApiErrorResponseError,
  GitlabApiOperationFailedError,
  GitlabUnexpectedResponseFormatError,
} from '../../../domain/errors';

const origin = 'GitlabRepository';

/**
 * One entry of a GitLab recursive tree listing.
 *
 * `id` is the blob's SHA-1 — the same hash `gitBlobSha` computes from content
 * held locally — and `mode` is the Unix mode string, `100755` for an
 * executable file. Both are optional because nothing in the response
 * guarantees them; callers read a missing one as "cannot tell", not as a
 * value.
 */
type GitlabTreeItem = {
  path: string;
  type: string;
  id?: string;
  mode?: string;
};

/** What the tree already tells us about a file that exists on the branch. */
type ExistingBlob = {
  sha?: string;
  mode?: string;
};

type FileAnalysis = {
  path: string;
  hasChanges: boolean;
  action: 'create' | 'update';
  existingExecuteFilemode: boolean;
};

export class GitlabRepository implements IGitRepo {
  private readonly axiosInstance: AxiosInstance;
  private readonly options: GitlabRepositoryOptions;
  private readonly baseUrl: string;
  private readonly projectPath: string;
  private readonly encodedProjectPath: string;

  constructor(
    private readonly token: string,
    options: GitlabRepositoryOptions,
    baseUrl?: string,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('Initializing GitlabRepository', {
      owner: options.owner,
      repo: options.repo,
      branch: options.branch,
    });

    // The configured URL may be either a GitLab base URL or a full API URL.
    const providedUrl = baseUrl || 'https://gitlab.com';

    this.baseUrl = providedUrl.includes('/api/v4')
      ? providedUrl
      : `${providedUrl.replace(/\/$/, '')}/api/v4`;
    const normalizedRepo = this.normalizeRepo(options.repo);

    this.projectPath = `${options.owner}/${normalizedRepo}`;
    this.encodedProjectPath = encodeURIComponent(this.projectPath);

    this.logger.debug('GitLab project path construction', {
      owner: options.owner,
      repo: normalizedRepo,
      constructedPath: this.projectPath,
    });

    this.options = {
      branch: 'main',
      ...options,
    };

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: PROVIDER_REQUEST_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        'PRIVATE-TOKEN': this.token,
      },
      httpsAgent: providerHttpsAgent,
    });

    this.logger.debug('GitlabRepository initialized successfully', {
      projectPath: this.projectPath,
    });
  }

  private normalizeRepo(repoName: string): string {
    // GitLab project paths are kebab-case, never spaced.
    return repoName.includes(' ')
      ? repoName.toLowerCase().replace(/\s+/g, '-')
      : repoName;
  }

  private normalizePath(path: string): string {
    let start = 0;
    while (start < path.length && path[start] === '/') {
      start++;
    }
    let end = path.length;
    while (end > start && path[end - 1] === '/') {
      end--;
    }
    return path.slice(start, end);
  }

  /**
   * Every blob in the repository, from one paginated walk. Shared by the
   * commit diff and the directory listings so neither walks the repository
   * for itself.
   */
  private async walkRepositoryTree(branch: string): Promise<GitlabTreeItem[]> {
    const allTreeItems: GitlabTreeItem[] = [];
    let nextPage: string | null = null;
    let pageNumber = 1;
    const perPage = 100;

    do {
      const url =
        nextPage || `/projects/${this.encodedProjectPath}/repository/tree`;

      const params: Record<string, string | number> = {
        ref: branch,
        recursive: 'true',
        per_page: perPage,
      };

      if (!nextPage) {
        params['page'] = pageNumber;
      }

      const treeResponse = await this.axiosInstance.get(url, {
        params: nextPage ? undefined : params,
      });

      if (Array.isArray(treeResponse.data)) {
        allTreeItems.push(...treeResponse.data);
      }

      const headers = treeResponse.headers as Record<string, string>;
      nextPage = null;

      // Check for offset pagination (x-next-page header)
      const xNextPage = headers['x-next-page'];
      if (xNextPage && xNextPage.trim() !== '') {
        nextPage = `/projects/${this.encodedProjectPath}/repository/tree?ref=${branch}&recursive=true&per_page=${perPage}&page=${xNextPage}`;
      } else {
        // Check for keyset pagination (Link header)
        const linkHeader = headers['link'];
        if (linkHeader) {
          const nextUrl = extractNextPageUrl(linkHeader);
          if (nextUrl) {
            nextPage = nextUrl;
          }
        }
      }

      pageNumber++;

      if (pageNumber > 1000) {
        this.logger.warn(
          'Reached maximum page limit (1000) for GitLab tree listing',
          {
            projectPath: this.projectPath,
            branch,
            totalItems: allTreeItems.length,
            pagesProcessed: pageNumber - 1,
          },
        );
        break;
      }
    } while (nextPage);

    return allTreeItems.filter((item) => item.type === 'blob');
  }

  /**
   * The repository's blobs keyed by normalised path, keeping the SHA and mode
   * the listing reported. Those two fields are what let `commitFiles` decide
   * which files changed without downloading any of them: a blob SHA is a hash
   * of the bytes, so hashing the content to be written answers the question
   * locally.
   */
  private async fetchRepositoryTree(
    branch: string,
  ): Promise<Map<string, ExistingBlob>> {
    const blobs = await this.walkRepositoryTree(branch);

    return new Map(
      blobs.map((item) => [
        this.normalizePath(item.path),
        { sha: item.id, mode: item.mode },
      ]),
    );
  }

  /**
   * Which files changed, worked out from the tree alone: it carries a SHA per
   * path, so comparing against local content is a hash rather than one files
   * API request per file.
   */
  private analyzeFilesForCommit(
    files: CommitFile[],
    existingBlobs: Map<string, ExistingBlob>,
  ): FileAnalysis[] {
    return files.map((file) => {
      const existing = existingBlobs.get(this.normalizePath(file.path));

      if (!existing) {
        // Absent from the tree means new.
        return {
          path: file.path,
          hasChanges: true,
          action: 'create' as const,
          existingExecuteFilemode: false,
        };
      }

      return {
        path: file.path,
        // A tree entry carrying no SHA tells us nothing, so the file goes into
        // the commit rather than being skipped: committing a file that turned
        // out to be identical costs one action, skipping one that changed
        // loses the change.
        hasChanges: !existing.sha || existing.sha !== gitBlobSha(file.content),
        action: 'update' as const,
        existingExecuteFilemode: this.isExecutableMode(existing.mode),
      };
    });
  }

  /**
   * Executable as the tree reports it: mode `100755` rather than `100644`. The
   * same bit the files API returns as `execute_filemode`, but readable without
   * a request per file.
   */
  private isExecutableMode(mode: string | undefined): boolean {
    if (!mode) {
      return false;
    }

    const parsed = Number.parseInt(mode, 8);

    return Number.isNaN(parsed) ? false : (parsed & 0o111) !== 0;
  }

  private isExecutable(permissions: string): boolean {
    return (
      permissions[2] === 'x' || permissions[5] === 'x' || permissions[8] === 'x'
    );
  }

  async commitFiles(
    files: CommitFile[],
    commitMessage: string,
    deleteFiles?: { path: string }[],
  ): Promise<Omit<GitCommit, 'id'>> {
    this.logger.info('Committing files to GitLab repository', {
      fileCount: files.length,
      deleteFileCount: deleteFiles?.length ?? 0,
      owner: this.options.owner,
      repo: this.options.repo,
    });

    if (files.length === 0 && (!deleteFiles || deleteFiles.length === 0)) {
      throw new NoFilesToCommitError();
    }

    try {
      const { branch } = this.options;
      const targetBranch = branch || 'main';

      // GitLab's commit API fails with "A file with this name doesn't exist"
      // when one commit carries the same path twice; the last occurrence wins.
      const deduplicatedFiles = Array.from(
        files
          .reduce((map, file) => {
            map.set(this.normalizePath(file.path), file);
            return map;
          }, new Map<string, CommitFile>())
          .values(),
      );

      const deduplicatedDeleteFiles = deleteFiles
        ? Array.from(
            deleteFiles
              .reduce((map, file) => {
                map.set(this.normalizePath(file.path), file);
                return map;
              }, new Map<string, { path: string }>())
              .values(),
          )
        : undefined;

      // Fetch the tree once: it is the single source of truth for which files
      // exist, what they contain and how they are permissioned.
      const existingBlobs = await this.fetchRepositoryTree(targetBranch);

      const fileAnalysis = this.analyzeFilesForCommit(
        deduplicatedFiles,
        existingBlobs,
      );

      const fileDifferenceCheck = fileAnalysis;

      const actions: Array<
        | { action: 'create' | 'update'; file_path: string; content: string }
        | { action: 'delete'; file_path: string }
        | { action: 'chmod'; file_path: string; execute_filemode: boolean }
      > = deduplicatedFiles
        .map((file, index) => {
          const analysis = fileAnalysis[index];
          return { file, analysis };
        })
        .filter(
          ({ analysis }) => analysis.action === 'create' || analysis.hasChanges,
        )
        .map(({ file, analysis }) => ({
          action: analysis.action,
          file_path: file.path,
          content: file.content,
        }));

      let existingDeleteFiles: { path: string }[] = [];
      if (deduplicatedDeleteFiles && deduplicatedDeleteFiles.length > 0) {
        existingDeleteFiles = deduplicatedDeleteFiles.filter((file) =>
          existingBlobs.has(this.normalizePath(file.path)),
        );

        const skippedCount =
          deduplicatedDeleteFiles.length - existingDeleteFiles.length;
        if (skippedCount > 0) {
          this.logger.debug('Skipping deletion of non-existent files', {
            skippedCount,
            projectPath: this.projectPath,
          });
        }

        if (existingDeleteFiles.length > 0) {
          this.logger.info('Adding files for deletion to commit', {
            deleteFileCount: existingDeleteFiles.length,
            skippedCount,
            projectPath: this.projectPath,
          });

          for (const file of existingDeleteFiles) {
            actions.push({
              action: 'delete' as const,
              file_path: file.path,
            });
          }
        }
      }

      // chmod actions must come after the create/update ones that put the
      // files there.
      for (let i = 0; i < deduplicatedFiles.length; i++) {
        const file = deduplicatedFiles[i];
        const analysis = fileAnalysis[i];
        if (file.permissions && this.isExecutable(file.permissions)) {
          if (analysis.existingExecuteFilemode) {
            continue;
          }
          actions.push({
            action: 'chmod' as const,
            file_path: file.path,
            execute_filemode: true,
          });
        } else if (
          file.permissions &&
          !this.isExecutable(file.permissions) &&
          analysis.existingExecuteFilemode
        ) {
          actions.push({
            action: 'chmod' as const,
            file_path: file.path,
            execute_filemode: false,
          });
        }
      }

      const hasFileChanges = fileDifferenceCheck.some(
        (file) => file.hasChanges,
      );
      const hasPermissionChanges = deduplicatedFiles.some((file, index) => {
        if (!file.permissions) return false;
        const wantsExecutable = this.isExecutable(file.permissions);
        const isAlreadyExecutable = fileAnalysis[index].existingExecuteFilemode;
        return wantsExecutable !== isAlreadyExecutable;
      });
      const hasDeletions = existingDeleteFiles.length > 0;
      const hasChanges = hasFileChanges || hasDeletions || hasPermissionChanges;

      if (!hasChanges) {
        this.logger.info('No changes detected, skipping commit', {
          fileCount: deduplicatedFiles.length,
          deleteFileCount: deduplicatedDeleteFiles?.length ?? 0,
          owner: this.options.owner,
          repo: this.options.repo,
          branch: targetBranch,
        });

        return {
          sha: 'no-changes',
          message: '',
          author: '',
          url: ``,
        };
      }

      this.logger.debug('Creating commit with actions', {
        branch: targetBranch,
        actionCount: actions.length,
        deleteCount: existingDeleteFiles.length,
        projectPath: this.projectPath,
      });

      const commitResponse = await this.axiosInstance.post(
        `/projects/${this.encodedProjectPath}/repository/commits`,
        {
          branch: targetBranch,
          commit_message: commitMessage,
          actions: actions,
        },
      );

      const commitInfo = {
        sha: commitResponse.data.id,
        message: commitMessage,
        author:
          commitResponse.data.author_email ||
          commitResponse.data.committer_email ||
          'unknown',
        url:
          commitResponse.data.web_url ||
          `${this.baseUrl.replace('/api/v4', '')}/${this.projectPath}/-/commit/${commitResponse.data.id}`,
      };

      this.logger.info('Files committed successfully to GitLab', {
        fileCount: deduplicatedFiles.length,
        projectPath: this.projectPath,
        commitSha: commitInfo.sha,
      });

      return commitInfo;
    } catch (error) {
      // A 429 is GitLab asking us to wait, not GitLab failing: it has to be
      // told apart before the generic upstream error below turns it into a
      // 502 the frontend would retry straight back into the limit.
      const throttled = gitlabRateLimitedError(error, {
        owner: this.options.owner,
        repo: this.options.repo,
        projectPath: this.projectPath,
      });
      if (throttled) throw throttled;

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response?: { status: number; data?: { message?: string } };
        };

        this.logger.error('GitLab API error', {
          statusCode: axiosError.response?.status,
          projectPath: this.projectPath,
          error: axiosError.response?.data?.message || errorMessage,
          errorDetails: axiosError.response?.data, // Log FULL response for debugging
        });

        if (axiosError.response?.status === 403) {
          throw new GitRemoteAccessForbiddenError(
            'GitLab',
            this.options.owner,
            this.options.repo,
            'write',
          );
        }

        if (axiosError.response?.status === 404) {
          throw new GitRemoteRepositoryNotFoundError(
            'GitLab',
            this.options.owner,
            this.options.repo,
          );
        }
      }

      this.logger.error('Failed to commit files to GitLab repository', {
        fileCount: files.length,
        projectPath: this.projectPath,
        error: errorMessage,
      });
      throw new GitlabApiOperationFailedError('commit files to GitLab', error, {
        owner: this.options.owner,
        repo: this.options.repo,
        projectPath: this.projectPath,
      });
    }
  }

  async createBranchFromBase(targetBranch: string): Promise<void> {
    const baseBranch = this.options.branch || 'main';

    this.logger.info('Ensuring branch exists on GitLab repository', {
      projectPath: this.projectPath,
      baseBranch,
      targetBranch,
    });

    const encodedTargetBranch = encodeURIComponent(targetBranch);
    try {
      await this.axiosInstance.get(
        `/projects/${this.encodedProjectPath}/repository/branches/${encodedTargetBranch}`,
      );

      this.logger.debug('Target branch already exists, skipping creation', {
        projectPath: this.projectPath,
        targetBranch,
      });
      return;
    } catch (error) {
      const throttled = gitlabRateLimitedError(error, {
        projectPath: this.projectPath,
        branch: targetBranch,
      });
      if (throttled) throw throttled;

      const status = this.extractHttpStatus(error);
      if (status !== 404) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to probe target branch existence on GitLab', {
          projectPath: this.projectPath,
          targetBranch,
          error: errorMessage,
        });
        throw new GitlabApiOperationFailedError(
          `ensure branch '${targetBranch}' on GitLab`,
          error,
          { projectPath: this.projectPath, branch: targetBranch },
        );
      }
      // 404 is the only tolerated failure: the branch is simply missing.
      this.logger.debug('Target branch missing, will create from base', {
        projectPath: this.projectPath,
        baseBranch,
        targetBranch,
      });
    }

    // GitLab validates that `ref` exists, so a missing base branch surfaces
    // as a failure here rather than silently creating nothing.
    try {
      await this.axiosInstance.post(
        `/projects/${this.encodedProjectPath}/repository/branches`,
        null,
        {
          params: {
            branch: targetBranch,
            ref: baseBranch,
          },
        },
      );

      this.logger.info('Created target branch on GitLab', {
        projectPath: this.projectPath,
        baseBranch,
        targetBranch,
      });
    } catch (error) {
      const throttled = gitlabRateLimitedError(error, {
        projectPath: this.projectPath,
        branch: targetBranch,
      });
      if (throttled) throw throttled;

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to create target branch on GitLab', {
        projectPath: this.projectPath,
        baseBranch,
        targetBranch,
        error: errorMessage,
      });
      throw new GitlabApiOperationFailedError(
        `create branch '${targetBranch}' on GitLab`,
        error,
        { projectPath: this.projectPath, branch: targetBranch },
      );
    }
  }

  async deleteBranch(targetBranch: string): Promise<void> {
    this.logger.info('Deleting branch on GitLab repository', {
      projectPath: this.projectPath,
      targetBranch,
    });

    const encodedTargetBranch = encodeURIComponent(targetBranch);
    try {
      await this.axiosInstance.delete(
        `/projects/${this.encodedProjectPath}/repository/branches/${encodedTargetBranch}`,
      );

      this.logger.info('Deleted branch on GitLab', {
        projectPath: this.projectPath,
        targetBranch,
      });
    } catch (error) {
      const throttled = gitlabRateLimitedError(error, {
        projectPath: this.projectPath,
        branch: targetBranch,
      });
      if (throttled) throw throttled;

      const status = this.extractHttpStatus(error);
      if (status === 404) {
        this.logger.debug('Branch already absent on GitLab, skipping delete', {
          projectPath: this.projectPath,
          targetBranch,
        });
        return;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to delete branch on GitLab', {
        projectPath: this.projectPath,
        targetBranch,
        error: errorMessage,
      });
      throw new GitlabApiOperationFailedError(
        `delete branch '${targetBranch}' on GitLab`,
        error,
        { projectPath: this.projectPath, branch: targetBranch },
      );
    }
  }

  async openOrUpdatePullRequest(command: {
    head: string;
    title: string;
    body?: string;
  }): Promise<{ url: string; number: number; wasCreated: boolean }> {
    const baseBranch = this.options.branch || 'main';
    const { head, title, body } = command;

    this.logger.info('Ensuring rolling merge request on GitLab repository', {
      projectPath: this.projectPath,
      head,
      base: baseBranch,
    });

    try {
      const lookupResponse = await this.axiosInstance.get(
        `/projects/${this.encodedProjectPath}/merge_requests`,
        {
          params: {
            source_branch: head,
            target_branch: baseBranch,
            state: 'opened',
          },
        },
      );

      if (
        Array.isArray(lookupResponse.data) &&
        lookupResponse.data.length > 0
      ) {
        const first = lookupResponse.data[0];
        this.logger.debug('Existing open merge request found, updating it', {
          projectPath: this.projectPath,
          head,
          base: baseBranch,
          iid: first.iid,
        });
        // Refresh title + description rather than leaving stale text behind —
        // the marketplace sync MR recomputes its description on every publish.
        await this.updateMergeRequest(first.iid, title, body);
        return {
          url: first.web_url,
          number: first.iid,
          wasCreated: false,
        };
      }
    } catch (error) {
      const throttled = gitlabRateLimitedError(error, {
        projectPath: this.projectPath,
        branch: head,
      });
      if (throttled) throw throttled;

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to look up merge request on GitLab', {
        projectPath: this.projectPath,
        head,
        base: baseBranch,
        error: errorMessage,
      });
      throw new GitlabApiOperationFailedError(
        `look up merge request on GitLab for '${head}' -> '${baseBranch}'`,
        error,
        { projectPath: this.projectPath, branch: head },
      );
    }

    try {
      const createResponse = await this.axiosInstance.post(
        `/projects/${this.encodedProjectPath}/merge_requests`,
        {
          source_branch: head,
          target_branch: baseBranch,
          title,
          description: body,
        },
      );

      this.logger.info('Created merge request on GitLab', {
        projectPath: this.projectPath,
        head,
        base: baseBranch,
        iid: createResponse.data.iid,
      });

      return {
        url: createResponse.data.web_url,
        number: createResponse.data.iid,
        wasCreated: true,
      };
    } catch (error) {
      const throttled = gitlabRateLimitedError(error, {
        projectPath: this.projectPath,
        branch: head,
      });
      if (throttled) throw throttled;

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to create merge request on GitLab', {
        projectPath: this.projectPath,
        head,
        base: baseBranch,
        error: errorMessage,
      });
      throw new GitlabApiOperationFailedError(
        `open merge request on GitLab for '${head}' -> '${baseBranch}'`,
        error,
        { projectPath: this.projectPath, branch: head },
      );
    }
  }

  async compareBranches(
    base: string,
    head: string,
  ): Promise<GitBranchComparison> {
    try {
      const response = await this.axiosInstance.get(
        `/projects/${this.encodedProjectPath}/repository/compare`,
        { params: { from: base, to: head } },
      );

      const diffs: Array<{
        old_path?: string;
        new_path?: string;
        new_file?: boolean;
        renamed_file?: boolean;
        deleted_file?: boolean;
      }> = Array.isArray(response.data?.diffs) ? response.data.diffs : [];

      const files: GitFileChange[] = [];
      for (const diff of diffs) {
        // A rename yields two entries (old path removed, new path added) so
        // callers reasoning about per-directory contents see both sides.
        if (diff.renamed_file) {
          if (diff.new_path) {
            files.push({ path: diff.new_path, status: 'added' });
          }
          if (diff.old_path) {
            files.push({ path: diff.old_path, status: 'removed' });
          }
          continue;
        }
        if (diff.deleted_file) {
          const path = diff.old_path ?? diff.new_path;
          if (path) {
            files.push({ path, status: 'removed' });
          }
          continue;
        }
        const path = diff.new_path ?? diff.old_path;
        if (path) {
          files.push({ path, status: diff.new_file ? 'added' : 'modified' });
        }
      }

      // GitLab gives up on very large comparisons and flags the response
      // rather than failing, so the diff list can be silently partial.
      const truncated = response.data?.compare_timeout === true;

      this.logger.debug('Compared branches on GitLab', {
        projectPath: this.projectPath,
        base,
        head,
        fileCount: files.length,
        truncated,
      });

      return { files, truncated };
    } catch (error) {
      const throttled = gitlabRateLimitedError(error, {
        projectPath: this.projectPath,
      });
      if (throttled) throw throttled;

      const status = this.extractHttpStatus(error);
      if (status === 404) {
        // One of the two refs does not exist — nothing to compare.
        this.logger.debug('Branch comparison target missing on GitLab', {
          projectPath: this.projectPath,
          base,
          head,
        });
        return { files: [], truncated: false };
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to compare branches on GitLab', {
        projectPath: this.projectPath,
        base,
        head,
        error: errorMessage,
      });
      throw new GitlabApiOperationFailedError(
        `compare '${base}'...'${head}' on GitLab`,
        error,
        { projectPath: this.projectPath },
      );
    }
  }

  /**
   * Refresh an open merge request's title and description.
   *
   * Deliberately non-throwing, mirroring the GitHub adapter: the caller already
   * holds a usable MR URL, and the rolling marketplace sync MR treats its
   * description as cosmetic. A failure is logged and swallowed.
   */
  private async updateMergeRequest(
    mergeRequestIid: number,
    title: string,
    body?: string,
  ): Promise<void> {
    try {
      await this.axiosInstance.put(
        `/projects/${this.encodedProjectPath}/merge_requests/${mergeRequestIid}`,
        body === undefined ? { title } : { title, description: body },
      );
      this.logger.debug('Updated merge request on GitLab', {
        projectPath: this.projectPath,
        iid: mergeRequestIid,
      });
    } catch (error) {
      this.logger.warn('Failed to update merge request on GitLab', {
        projectPath: this.projectPath,
        iid: mergeRequestIid,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  public async findOpenPullRequest(
    head: string,
  ): Promise<{ url: string; number: number } | null> {
    const baseBranch = this.options.branch || 'main';
    const response = await this.axiosInstance.get(
      `/projects/${this.encodedProjectPath}/merge_requests`,
      {
        params: {
          source_branch: head,
          target_branch: baseBranch,
          state: 'opened',
        },
      },
    );
    if (Array.isArray(response.data) && response.data.length > 0) {
      const first = response.data[0];
      return { url: first.web_url, number: first.iid };
    }
    return null;
  }

  public async checkRepositoryExists(): Promise<{
    exists: boolean;
    reason?: 'auth_failed' | 'repo_not_found' | 'network_transient';
  }> {
    try {
      await this.axiosInstance.get(`/projects/${this.encodedProjectPath}`);
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
    const targetBranch = branch || this.options.branch;

    try {
      this.logger.debug('Fetching file from repository', {
        path,
        owner: this.options.owner,
        repo: this.options.repo,
        branch: targetBranch,
      });

      const encodedPath = encodeURIComponent(path);
      const response = await withTransientRetry(
        () =>
          this.axiosInstance.get(
            `/projects/${this.encodedProjectPath}/repository/files/${encodedPath}`,
            {
              params: {
                ref: targetBranch,
              },
            },
          ),
        { logger: this.logger, label: `files ${this.projectPath}/${path}` },
      );

      if (response.data && response.data.blob_id) {
        this.logger.debug('File found in repository', {
          path,
          sha: response.data.blob_id,
        });
        return {
          sha: response.data.blob_id,
          content: response.data.content || '',
          execute_filemode: response.data.execute_filemode === true,
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
          owner: this.options.owner,
          repo: this.options.repo,
          branch: targetBranch,
        });
        return null;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch file from repository', {
        path,
        owner: this.options.owner,
        repo: this.options.repo,
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
    this.logger.info('Listing available repositories from GitLab', {
      name,
      owner,
      branch,
      path: path || '/',
    });

    try {
      const normalizedRepo = this.normalizeRepo(name);

      const projectPath = `${owner}/${normalizedRepo}`;
      const encodedProjectPath = encodeURIComponent(projectPath);

      const directories: string[] = [];
      let nextPage: string | null = null;
      let pageNumber = 1;
      const perPage = 100;

      do {
        const url = nextPage
          ? nextPage
          : `/projects/${encodedProjectPath}/repository/tree`;

        const params: Record<string, string | number> = {
          ref: branch,
          recursive: 'true',
          per_page: perPage,
        };

        if (path && path !== '/') {
          const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
          params['path'] = normalizedPath;
        }

        if (!nextPage) {
          params['page'] = pageNumber;
        }

        const response: AxiosResponse<
          Array<{ type: string; path: string }> | { message?: string }
        > = await this.axiosInstance.get(url, {
          params: nextPage ? undefined : params,
        });

        if (!Array.isArray(response.data)) {
          if (
            typeof response.data === 'object' &&
            response.data &&
            'message' in response.data
          ) {
            throw new GitlabApiErrorResponseError(
              projectPath,
              branch,
              response.data.message,
            );
          }
          throw new GitlabUnexpectedResponseFormatError(projectPath, branch);
        }

        let pageDirectories = response.data
          .filter((item: { type: string }) => item.type === 'tree')
          .map((item: { path: string }) => item.path);

        // GitLab returns entries from within the requested path, so the
        // prefix has to be re-applied to report them as repository paths.
        if (path && path !== '/') {
          const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
          const pathPrefix = normalizedPath.endsWith('/')
            ? normalizedPath
            : `${normalizedPath}/`;

          pageDirectories = pageDirectories
            .filter((dirPath: string) => dirPath.startsWith(pathPrefix))
            .map((dirPath: string) => dirPath.slice(pathPrefix.length))
            .filter(
              (relativePath: string) => relativePath && relativePath.length > 0,
            );
        }

        directories.push(...pageDirectories);

        this.logger.info('Processed page response', {
          pageNumber,
          totalItemsInResponse: response.data.length,
          directoriesInPage: pageDirectories.length,
          totalDirectoriesCollected: directories.length,
          projectPath,
          branch,
        });

        const headers = response.headers as Record<string, string>;
        nextPage = null;

        // Check for offset pagination (x-next-page header)
        const xNextPage = headers['x-next-page'];
        if (xNextPage && xNextPage.trim() !== '') {
          let nextPageUrl = `/projects/${encodedProjectPath}/repository/tree?ref=${branch}&recursive=true&per_page=${perPage}&page=${xNextPage}`;
          if (path && path !== '/') {
            const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
            nextPageUrl += `&path=${encodeURIComponent(normalizedPath)}`;
          }
          nextPage = nextPageUrl;
        } else {
          // Check for keyset pagination (Link header)
          const linkHeader = headers['link'];
          if (linkHeader) {
            const nextUrl = extractNextPageUrl(linkHeader);
            if (nextUrl) {
              nextPage = nextUrl;
            }
          }
        }

        pageNumber++;

        if (pageNumber > 1000) {
          this.logger.warn(
            'Reached maximum page limit (1000) for GitLab tree listing',
            {
              projectPath,
              branch,
              totalDirectories: directories.length,
              pagesProcessed: pageNumber - 1,
            },
          );
          break;
        }
      } while (nextPage);

      this.logger.info('Successfully retrieved directories from GitLab', {
        owner,
        repo: normalizedRepo,
        branch,
        path: path || '/',
        directoryCount: directories.length,
        pagesProcessed: pageNumber - 1,
      });

      return directories;
    } catch (error) {
      const throttled = gitlabRateLimitedError(error, {
        owner,
        repo: name,
        branch,
      });
      if (throttled) throw throttled;

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response?: { status: number; data?: { message?: string } };
        };

        this.logger.error('GitLab API error during directory listing', {
          statusCode: axiosError.response?.status,
          projectPath: `${owner}/${name}`,
          branch,
          error: axiosError.response?.data?.message || errorMessage,
        });

        if (axiosError.response?.status === 403) {
          throw new GitRemoteAccessForbiddenError(
            'GitLab',
            owner,
            name,
            'read',
          );
        }

        if (axiosError.response?.status === 404) {
          throw new GitRemoteRepositoryNotFoundError(
            'GitLab',
            owner,
            name,
            branch,
          );
        }
      }

      this.logger.error('Failed to list available repositories from GitLab', {
        name,
        owner,
        branch,
        error: errorMessage,
      });
      throw new GitlabApiOperationFailedError(
        'list repositories from GitLab',
        error,
        { owner, repo: name, branch },
      );
    }
  }

  async checkDirectoryExists(
    directoryPath: string,
    branch: string,
  ): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get(
        `/projects/${this.encodedProjectPath}/repository/tree`,
        {
          params: {
            ref: branch,
            path: directoryPath,
            per_page: 1, // We only need to know if something exists
          },
        },
      );

      if (Array.isArray(response.data) && response.data.length > 0) {
        return true;
      }

      // An empty array still means the directory exists, just with nothing
      // in it.
      if (Array.isArray(response.data) && response.data.length === 0) {
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
        owner: this.options.owner,
        repo: this.options.repo,
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
    return this.listFilesInDirectories([path], branch);
  }

  /**
   * The files under every requested directory, from one tree walk — rather
   * than one full paginated walk per directory, which is what looping over
   * the singular form would cost.
   */
  async listFilesInDirectories(
    paths: string[],
    branch: string,
  ): Promise<{ path: string }[]> {
    if (paths.length === 0) {
      return [];
    }

    try {
      const blobs = await this.walkRepositoryTree(branch);

      // Filtered per path rather than once against all prefixes, so the
      // result keeps the order and the duplicates that looping the singular
      // form produces.
      const files = paths.flatMap((path) => {
        const normalizedPath = path.endsWith('/') ? path : `${path}/`;

        return blobs
          .filter((item) => item.path.startsWith(normalizedPath))
          .map((item) => ({ path: item.path }));
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
        owner: this.options.owner,
        repo: this.options.repo,
        branch,
        error: errorMessage,
      });
      // An unreachable or missing tree means "nothing to expand", not a
      // failed publish.
      return [];
    }
  }
}
