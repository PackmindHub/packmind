import { IGitRepo, CommitFile } from '../../../domain/repositories/IGitRepo';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { PackmindLogger } from '@packmind/logger';
import { GitCommit } from '@packmind/types';
import { GitlabRepositoryOptions } from './types';
import { extractNextPageUrl } from './linkHeaderUtils';

const origin = 'GitlabRepository';

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

    // Handle both cases: user enters base GitLab URL or full API URL
    const providedUrl = baseUrl || 'https://gitlab.com';

    // If the URL already includes /api/v4, use it as-is, otherwise append it
    this.baseUrl = providedUrl.includes('/api/v4')
      ? providedUrl
      : `${providedUrl.replace(/\/$/, '')}/api/v4`;
    // For GitLab, intelligently construct project path
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
      headers: {
        'Content-Type': 'application/json',
        'PRIVATE-TOKEN': this.token, // Use header authentication as shown in GitLab docs
      },
      // Note: GitLab API docs show PRIVATE-TOKEN header authentication
    });

    this.logger.debug('GitlabRepository initialized successfully', {
      projectPath: this.projectPath,
    });
  }

  private normalizeRepo(repoName: string): string {
    // For GitLab, if repo name has spaces, convert to kebab-case (GitLab standard)
    return repoName.includes(' ')
      ? repoName.toLowerCase().replace(/\s+/g, '-')
      : repoName;
  }

  private normalizePath(path: string): string {
    // Trim leading slashes
    let start = 0;
    while (start < path.length && path[start] === '/') {
      start++;
    }
    // Trim trailing slashes
    let end = path.length;
    while (end > start && path[end - 1] === '/') {
      end--;
    }
    return path.slice(start, end);
  }

  private async fetchRepositoryTree(branch: string): Promise<Set<string>> {
    const allTreeItems: Array<{ path: string; type: string }> = [];
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

      // Check for pagination headers
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

      // Safety check to prevent infinite loops
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

    // Return normalized paths for blobs only
    return new Set(
      allTreeItems
        .filter((item: { type: string }) => item.type === 'blob')
        .map((item: { path: string }) => this.normalizePath(item.path)),
    );
  }

  private static readonly FILE_ANALYSIS_BATCH_SIZE = 10;

  private async analyzeFilesForCommit(
    files: CommitFile[],
    existingPaths: Set<string>,
    targetBranch: string,
  ): Promise<
    Array<{
      path: string;
      hasChanges: boolean;
      action: 'create' | 'update';
      existingExecuteFilemode: boolean;
    }>
  > {
    type FileAnalysisResult = {
      path: string;
      hasChanges: boolean;
      action: 'create' | 'update';
      existingExecuteFilemode: boolean;
    };

    // Pre-allocate results array to preserve original file order
    const results: FileAnalysisResult[] = new Array(files.length);

    // Resolve new files immediately, collect existing files with their original indices
    const existingFileIndices: Array<{ index: number; file: CommitFile }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const normalizedPath = this.normalizePath(file.path);

      if (!existingPaths.has(normalizedPath)) {
        this.logger.debug('File action determined', {
          filePath: file.path,
          action: 'create',
        });
        results[i] = {
          path: file.path,
          hasChanges: true,
          action: 'create',
          existingExecuteFilemode: false,
        };
      } else {
        existingFileIndices.push({ index: i, file });
      }
    }

    // Existing files need content check — process in batches to avoid rate limiting
    for (
      let i = 0;
      i < existingFileIndices.length;
      i += GitlabRepository.FILE_ANALYSIS_BATCH_SIZE
    ) {
      const batch = existingFileIndices.slice(
        i,
        i + GitlabRepository.FILE_ANALYSIS_BATCH_SIZE,
      );
      const batchResults = await Promise.all(
        batch.map(async ({ file }) =>
          this.analyzeExistingFile(file, targetBranch),
        ),
      );
      for (let j = 0; j < batch.length; j++) {
        results[batch[j].index] = batchResults[j];
      }
    }

    return results;
  }

  private async analyzeExistingFile(
    file: CommitFile,
    targetBranch: string,
  ): Promise<{
    path: string;
    hasChanges: boolean;
    action: 'create' | 'update';
    existingExecuteFilemode: boolean;
  }> {
    try {
      const existingFile = await this.getFileOnRepo(file.path, targetBranch);

      if (!existingFile) {
        return {
          path: file.path,
          hasChanges: true,
          action: 'create',
          existingExecuteFilemode: false,
        };
      }

      const existingContent = Buffer.from(
        existingFile.content,
        'base64',
      ).toString('utf-8');
      const hasChanges = existingContent !== file.content;

      return {
        path: file.path,
        hasChanges,
        action: 'update',
        existingExecuteFilemode: existingFile.execute_filemode === true,
      };
    } catch (fileError: unknown) {
      // If the files API fails for an existing file, treat as create
      // This handles transient errors gracefully
      this.logger.debug('File content check failed, treating as create', {
        filePath: file.path,
        error:
          fileError instanceof Error ? fileError.message : String(fileError),
      });
      return {
        path: file.path,
        hasChanges: true,
        action: 'create',
        existingExecuteFilemode: false,
      };
    }
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
      throw new Error('No files to commit');
    }

    try {
      const { branch } = this.options;
      const targetBranch = branch || 'main';

      // Deduplicate files by path (keep last occurrence to get most recent content)
      // GitLab's commit API fails with "A file with this name doesn't exist" when
      // duplicate paths are present in a single commit
      const deduplicatedFiles = Array.from(
        files
          .reduce((map, file) => {
            map.set(this.normalizePath(file.path), file);
            return map;
          }, new Map<string, CommitFile>())
          .values(),
      );

      // Deduplicate deleteFiles by path
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

      // Fetch tree once as single source of truth for file existence
      // This prevents race conditions and inconsistent state between create/update/delete decisions
      const existingPaths = await this.fetchRepositoryTree(targetBranch);

      // Determine create/update for files to commit using tree lookup
      // Only call the files API for existing files to check content changes and existing permissions
      // Process in batches to avoid overwhelming the GitLab API with concurrent requests
      const fileAnalysis = await this.analyzeFilesForCommit(
        deduplicatedFiles,
        existingPaths,
        targetBranch,
      );

      const fileDifferenceCheck = fileAnalysis;

      // Prepare actions with correct create/update types
      // Only include files with content changes or new files (skip unchanged updates)
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

      // Filter deleteFiles using the same existingPaths from tree
      let existingDeleteFiles: { path: string }[] = [];
      if (deduplicatedDeleteFiles && deduplicatedDeleteFiles.length > 0) {
        existingDeleteFiles = deduplicatedDeleteFiles.filter((file) =>
          existingPaths.has(this.normalizePath(file.path)),
        );

        const skippedCount =
          deduplicatedDeleteFiles.length - existingDeleteFiles.length;
        if (skippedCount > 0) {
          this.logger.debug('Skipping deletion of non-existent files', {
            skippedCount,
            projectPath: this.projectPath,
          });
        }

        // Add delete actions for existing files
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

      // Add chmod actions for permission changes
      // (must come after create/update actions)
      for (let i = 0; i < deduplicatedFiles.length; i++) {
        const file = deduplicatedFiles[i];
        const analysis = fileAnalysis[i];
        if (file.permissions && this.isExecutable(file.permissions)) {
          // Skip chmod if the existing file already has execute_filemode
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
          // Remove executable bit when file is currently executable but desired permissions are not
          actions.push({
            action: 'chmod' as const,
            file_path: file.path,
            execute_filemode: false,
          });
        }
      }

      // Check if there are any changes to commit (content, permissions, or deletions)
      const hasFileChanges = fileDifferenceCheck.some(
        (file) => file.hasChanges,
      );
      const hasPermissionChanges = deduplicatedFiles.some((file, index) => {
        if (!file.permissions) return false;
        const wantsExecutable = this.isExecutable(file.permissions);
        const isAlreadyExecutable = fileAnalysis[index].existingExecuteFilemode;
        // Permission change if adding or removing executable bit
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

      // Create commit using GitLab Commits API
      const commitResponse = await this.axiosInstance.post(
        `/projects/${this.encodedProjectPath}/repository/commits`,
        {
          branch: targetBranch,
          commit_message: commitMessage,
          actions: actions,
        },
        // No need for query params since we use PRIVATE-TOKEN header
      );

      // Extract commit information from GitLab API response
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Check if this is a permission or not found error
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
          throw new Error(
            `Insufficient permissions to commit to GitLab repository. Please ensure your token has write access to ${this.options.owner}/${this.options.repo}`,
          );
        }

        if (axiosError.response?.status === 404) {
          throw new Error(
            `GitLab repository not found. Please verify the repository path: ${this.projectPath}. Check that the repository exists and your token has access to it.`,
          );
        }
      }

      this.logger.error('Failed to commit files to GitLab repository', {
        fileCount: files.length,
        projectPath: this.projectPath,
        error: errorMessage,
      });
      throw new Error(`Failed to commit files to GitLab: ${errorMessage}`);
    }
  }

  async createBranchFromBase(targetBranch: string): Promise<void> {
    const baseBranch = this.options.branch || 'main';

    this.logger.info('Ensuring branch exists on GitLab repository', {
      projectPath: this.projectPath,
      baseBranch,
      targetBranch,
    });

    // Step 1: Check if the target branch already exists. If GitLab returns
    // 2xx, the branch is present and no work is needed.
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
      const status = this.extractHttpStatus(error);
      if (status !== 404) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to probe target branch existence on GitLab', {
          projectPath: this.projectPath,
          targetBranch,
          error: errorMessage,
        });
        throw new Error(
          `Failed to ensure branch '${targetBranch}' on GitLab: ${errorMessage}`,
        );
      }
      // 404 -> branch missing, proceed to create it from the base branch.
      this.logger.debug('Target branch missing, will create from base', {
        projectPath: this.projectPath,
        baseBranch,
        targetBranch,
      });
    }

    // Step 2: Create the target branch from the base branch. GitLab's branch
    // creation endpoint validates that `ref` (the base) exists; propagate any
    // failure verbatim so the caller can surface it.
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to create target branch on GitLab', {
        projectPath: this.projectPath,
        baseBranch,
        targetBranch,
        error: errorMessage,
      });
      throw new Error(
        `Failed to create branch '${targetBranch}' on GitLab: ${errorMessage}`,
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

    // Step 1: Look up any open MR matching source -> target.
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
        this.logger.debug(
          'Existing open merge request found, skipping creation',
          {
            projectPath: this.projectPath,
            head,
            base: baseBranch,
            iid: first.iid,
          },
        );
        return {
          url: first.web_url,
          number: first.iid,
          wasCreated: false,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to look up merge request on GitLab', {
        projectPath: this.projectPath,
        head,
        base: baseBranch,
        error: errorMessage,
      });
      throw new Error(
        `Failed to look up merge request on GitLab for '${head}' -> '${baseBranch}': ${errorMessage}`,
      );
    }

    // Step 2: Create a new MR.
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to create merge request on GitLab', {
        projectPath: this.projectPath,
        head,
        base: baseBranch,
        error: errorMessage,
      });
      throw new Error(
        `Failed to open merge request on GitLab for '${head}' -> '${baseBranch}': ${errorMessage}`,
      );
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
      const response = await this.axiosInstance.get(
        `/projects/${this.encodedProjectPath}/repository/files/${encodedPath}`,
        {
          params: {
            ref: targetBranch,
          },
        },
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
          owner: this.options.owner,
          repo: this.options.repo,
          branch: targetBranch,
        });
        return null;
      }

      // Re-throw other errors
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
      // For GitLab, we need to construct the project path and use recursive pagination
      const normalizedRepo = this.normalizeRepo(name);

      const projectPath = `${owner}/${normalizedRepo}`;
      const encodedProjectPath = encodeURIComponent(projectPath);

      const directories: string[] = [];
      let nextPage: string | null = null;
      let pageNumber = 1;
      const perPage = 100;

      do {
        // Construct the URL for the current request
        const url = nextPage
          ? nextPage
          : `/projects/${encodedProjectPath}/repository/tree`;

        const params: Record<string, string | number> = {
          ref: branch,
          recursive: 'true',
          per_page: perPage,
        };

        // If a specific path is provided, add it to the API request
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

        // Validate that the response is a JSON array
        if (!Array.isArray(response.data)) {
          if (
            typeof response.data === 'object' &&
            response.data &&
            'message' in response.data
          ) {
            throw new Error(`GitLab API error: ${response.data.message}`);
          }
          throw new Error(
            'GitLab API did not return an array - unexpected response format',
          );
        }

        // Filter directories and add their paths
        let pageDirectories = response.data
          .filter((item: { type: string }) => item.type === 'tree')
          .map((item: { path: string }) => item.path);

        // If a specific path was provided, GitLab API returns items within that path
        // Show all subdirectories recursively under the specified path
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

        // Check for pagination headers
        const headers = response.headers as Record<string, string>;
        nextPage = null;

        // Check for offset pagination (x-next-page header)
        const xNextPage = headers['x-next-page'];
        if (xNextPage && xNextPage.trim() !== '') {
          // Build next page URL with the same parameters
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

        // Safety check to prevent infinite loops
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Check if this is a permission or not found error
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
          throw new Error(
            `Insufficient permissions to list directories in GitLab repository. Please ensure your token has read access to ${owner}/${name}`,
          );
        }

        if (axiosError.response?.status === 404) {
          throw new Error(
            `GitLab repository not found or branch '${branch}' does not exist. Please verify the repository path: ${owner}/${name} and branch: ${branch}`,
          );
        }
      }

      this.logger.error('Failed to list available repositories from GitLab', {
        name,
        owner,
        branch,
        error: errorMessage,
      });
      throw new Error(
        `Failed to list repositories from GitLab: ${errorMessage}`,
      );
    }
  }

  async checkDirectoryExists(
    directoryPath: string,
    branch: string,
  ): Promise<boolean> {
    try {
      // Use GitLab's repository tree API to check if the directory exists
      // We'll get the tree for the specific path to see if it exists
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

      // If we get a successful response with an array, the directory exists
      if (Array.isArray(response.data) && response.data.length > 0) {
        return true;
      }

      // If we get an empty array, the directory exists but is empty
      if (Array.isArray(response.data) && response.data.length === 0) {
        return true;
      }

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
    try {
      // Normalize path to ensure it ends with /
      const normalizedPath = path.endsWith('/') ? path : `${path}/`;

      // Fetch the repository tree recursively
      const allTreeItems: Array<{ path: string; type: string }> = [];
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

        const response = await this.axiosInstance.get(url, {
          params: nextPage ? undefined : params,
        });

        if (Array.isArray(response.data)) {
          allTreeItems.push(...response.data);
        }

        // Check for pagination
        const headers = response.headers as Record<string, string>;
        nextPage = null;

        const xNextPage = headers['x-next-page'];
        if (xNextPage && xNextPage.trim() !== '') {
          nextPage = `/projects/${this.encodedProjectPath}/repository/tree?ref=${branch}&recursive=true&per_page=${perPage}&page=${xNextPage}`;
        } else {
          const linkHeader = headers['link'];
          if (linkHeader) {
            const nextUrl = extractNextPageUrl(linkHeader);
            if (nextUrl) {
              nextPage = nextUrl;
            }
          }
        }

        pageNumber++;
      } while (nextPage);

      const files = allTreeItems
        .filter(
          (item) =>
            item.type === 'blob' && item.path.startsWith(normalizedPath),
        )
        .map((item) => ({ path: item.path }));

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
        owner: this.options.owner,
        repo: this.options.repo,
        branch,
        error: errorMessage,
      });
      // Return empty array if directory doesn't exist
      return [];
    }
  }
}
