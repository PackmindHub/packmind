import { IGitRepo } from '../../../domain/repositories/IGitRepo';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { PackmindLogger } from '@packmind/logger';
import { GitCommit } from '@packmind/types';
import { GitlabRepositoryOptions } from './types';
import { GitlabWebhookPushPayload } from '../../../domain/types/webhookPayloads';

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

  async commitFiles(
    files: { path: string; content: string }[],
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

      // Check file existence and prepare actions in one pass
      // For GitLab, we need to determine the correct action (create vs update) for each file
      let fileDifferenceCheck;
      let actions: Array<
        | { action: 'create' | 'update'; file_path: string; content: string }
        | { action: 'delete'; file_path: string }
      >;

      try {
        const fileAnalysis = await Promise.all(
          files.map(async (file) => {
            try {
              const existingFile = await this.getFileOnRepo(
                file.path,
                targetBranch,
              );

              if (!existingFile) {
                // File doesn't exist, so it's a new file
                return {
                  path: file.path,
                  hasChanges: true,
                  action: 'create' as const,
                  fileExists: false,
                };
              } else {
                // File exists, check if content is different
                const existingContent = Buffer.from(
                  existingFile.content,
                  'base64',
                ).toString('utf-8');
                const hasChanges = existingContent !== file.content;

                return {
                  path: file.path,
                  hasChanges,
                  action: 'update' as const,
                  fileExists: true,
                };
              }
            } catch (fileError: unknown) {
              // If file doesn't exist (404 or other error), treat as new file
              this.logger.debug('File check failed, treating as new file', {
                filePath: file.path,
                error:
                  fileError instanceof Error
                    ? fileError.message
                    : String(fileError),
              });
              return {
                path: file.path,
                hasChanges: true,
                action: 'create' as const,
                fileExists: false,
              };
            }
          }),
        );

        fileDifferenceCheck = fileAnalysis;

        // Prepare actions with correct create/update types
        actions = files.map((file, index) => {
          const analysis = fileAnalysis[index];

          this.logger.debug('File action determined', {
            filePath: file.path,
            action: analysis.action,
          });

          return {
            action: analysis.action,
            file_path: file.path,
            content: file.content,
          };
        });
      } catch (error) {
        // If we can't check files at all, assume all files are new
        this.logger.warn(
          'Could not check existing files, treating all as new',
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
        fileDifferenceCheck = files.map((file) => ({
          path: file.path,
          hasChanges: true,
        }));
        actions = files.map((file) => ({
          action: 'create' as const,
          file_path: file.path,
          content: file.content,
        }));
      }

      // Handle file deletions - fetch tree to filter non-existent files
      let existingDeleteFiles: { path: string }[] = [];
      if (deleteFiles && deleteFiles.length > 0) {
        // Fetch the repository tree to know which files exist
        const treeResponse = await this.axiosInstance.get(
          `/projects/${this.encodedProjectPath}/repository/tree`,
          {
            params: {
              ref: targetBranch,
              recursive: 'true',
              per_page: 100,
            },
          },
        );

        // Handle pagination for large repositories
        const allTreeItems: Array<{ path: string; type: string }> = [];
        if (Array.isArray(treeResponse.data)) {
          allTreeItems.push(...treeResponse.data);
        }

        const existingPaths = new Set(
          allTreeItems
            .filter((item: { type: string }) => item.type === 'blob')
            .map((item: { path: string }) => item.path),
        );

        // Filter deleteFiles to only include files that exist
        existingDeleteFiles = deleteFiles.filter((file) =>
          existingPaths.has(file.path),
        );

        const skippedCount = deleteFiles.length - existingDeleteFiles.length;
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

      // Check if there are any changes to commit
      const hasFileChanges = fileDifferenceCheck.some(
        (file) => file.hasChanges,
      );
      const hasDeletions = existingDeleteFiles.length > 0;
      const hasChanges = hasFileChanges || hasDeletions;

      if (!hasChanges) {
        this.logger.info('No changes detected, skipping commit', {
          fileCount: files.length,
          deleteFileCount: deleteFiles?.length ?? 0,
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
        fileCount: files.length,
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

  isValidBranch(ref: string): boolean {
    // Extract branch name from ref (e.g., "refs/heads/main" -> "main")
    const branchName = ref.replace('refs/heads/', '');
    return branchName === 'main';
  }

  isPushEventFromWebhook(headers: Record<string, string>): boolean {
    const gitlabEvent = headers['x-gitlab-event'];
    const isPushEvent = gitlabEvent === 'Push Hook';

    this.logger.debug('Checking if webhook is a push event', {
      eventType: gitlabEvent,
      isPushEvent,
    });

    return isPushEvent;
  }

  async getFileOnRepo(
    path: string,
    branch?: string,
  ): Promise<{ sha: string; content: string } | null> {
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

  private extractMatchingFilesFromCommits(
    commits: Array<{
      id?: string;
      message?: string;
      added?: string[];
      modified?: string[];
      removed?: string[];
      author?: {
        name?: string;
        email?: string;
      };
    }>,
    fileMatcher: RegExp,
  ): Map<
    string,
    { commitId: string; author: string | null; message: string | null }
  > {
    const fileToLatestCommit: Map<
      string,
      { commitId: string; author: string | null; message: string | null }
    > = new Map();

    this.logger.debug('Processing commits from webhook payload', {
      commitCount: commits.length,
    });

    // Process all commits to find modified files that match the pattern
    // Keep track of the latest commit for each file
    for (const commit of commits) {
      if (!commit.modified || !Array.isArray(commit.modified)) continue;

      this.logger.debug('Processing commit', {
        commitId: commit.id,
        modifiedFiles: commit.modified.length,
      });

      // Filter modified files that match the pattern
      const commitMatchingFiles = commit.modified.filter((filepath) =>
        fileMatcher.test(filepath),
      );

      this.logger.debug('Found matching files in commit', {
        commitId: commit.id,
        matchingFiles: commitMatchingFiles.length,
      });

      // Extract commit author and message
      const author = commit.author?.name || null;
      const message = commit.message || null;

      // Update the latest commit for each matching file
      commitMatchingFiles.forEach((filepath) => {
        fileToLatestCommit.set(filepath, {
          commitId: commit.id || '',
          author,
          message,
        });
        this.logger.debug('Updated latest commit for file', {
          filepath,
          commitId: commit.id,
          author,
          message,
        });
      });
    }

    return fileToLatestCommit;
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
            const linkMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
            if (linkMatch) {
              nextPage = linkMatch[1];
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
            const linkMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
            if (linkMatch) {
              nextPage = linkMatch[1];
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

  async handlePushHook(
    payload: unknown,
    fileMatcher: RegExp,
  ): Promise<
    {
      filepath: string;
      fileContent: string;
      author: string | null;
      gitSha: string | null;
      gitRepo: string | null;
      message: string | null;
    }[]
  > {
    this.logger.info('Processing GitLab webhook push payload', {
      owner: this.options.owner,
      repo: this.options.repo,
    });

    try {
      const pushPayload = payload as GitlabWebhookPushPayload;

      // Validate that this is a push event
      if (
        pushPayload.object_kind !== 'push' ||
        pushPayload.event_name !== 'push'
      ) {
        this.logger.info(
          'Webhook payload is not a push event - skipping processing',
          {
            owner: this.options.owner,
            repo: this.options.repo,
            objectKind: pushPayload.object_kind,
            eventName: pushPayload.event_name,
          },
        );
        return [];
      }

      // Handle missing or empty commits array gracefully
      if (!pushPayload.commits || !Array.isArray(pushPayload.commits)) {
        this.logger.info(
          'Webhook payload has no commits array - this could be a branch creation or deletion',
          {
            owner: this.options.owner,
            repo: this.options.repo,
            ref: pushPayload.ref,
            before: pushPayload.before,
            after: pushPayload.after,
            hasCommits: !!pushPayload.commits,
          },
        );
        return [];
      }

      // Handle empty commits array
      if (pushPayload.commits.length === 0) {
        this.logger.info(
          'Webhook payload has empty commits array - no files to process',
          {
            owner: this.options.owner,
            repo: this.options.repo,
          },
        );
        return [];
      }

      // Check if the webhook is from a valid branch (main)
      if (pushPayload.ref && !this.isValidBranch(pushPayload.ref)) {
        const branchName = pushPayload.ref.replace('refs/heads/', '');
        const repoName = `${this.options.owner}/${this.options.repo}`;
        this.logger.info(
          `Webhook from ${repoName} has been skipped since ${branchName} is out of scope`,
          {
            owner: this.options.owner,
            repo: this.options.repo,
            branch: branchName,
            ref: pushPayload.ref,
          },
        );
        return [];
      }

      const { owner, repo } = this.options;

      // Build git repository URL
      const gitRepo = `${this.baseUrl.replace('/api/v4', '')}/${owner}/${repo}`;

      // Extract matching files from commits using the helper method
      const fileToLatestCommit = this.extractMatchingFilesFromCommits(
        pushPayload.commits,
        fileMatcher,
      );

      // If no matching files, return empty array
      if (fileToLatestCommit.size === 0) {
        this.logger.info('No matching files found in webhook payload');
        return [];
      }

      this.logger.info('Found files to process', {
        fileCount: fileToLatestCommit.size,
      });

      // Fetch content for each matching file using the latest commit
      this.logger.debug('Fetching file contents from GitLab API');
      const filesWithContent = await Promise.all(
        Array.from(fileToLatestCommit.entries()).map(
          async ([filepath, { commitId, author, message }]) => {
            this.logger.debug('Fetching file content', { filepath, commitId });

            const encodedPath = encodeURIComponent(filepath);
            const response = await this.axiosInstance.get(
              `/projects/${this.encodedProjectPath}/repository/files/${encodedPath}`,
              {
                params: {
                  ref: commitId,
                },
              },
            );

            // GitLab API returns base64 encoded content
            const fileContent = Buffer.from(
              response.data.content,
              response.data.encoding,
            ).toString('utf-8');

            this.logger.debug('File content fetched successfully', {
              filepath,
              contentLength: fileContent.length,
            });

            return {
              filepath,
              fileContent,
              author,
              gitSha: commitId,
              gitRepo,
              message,
            };
          },
        ),
      );

      this.logger.info('Successfully processed webhook payload', {
        processedFiles: filesWithContent.length,
      });
      return filesWithContent;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Extract useful error information without overwhelming logs
      let errorInfo: {
        owner: string;
        repo: string;
        error: string;
        statusCode?: number;
        responsePreview?: string;
      } = {
        owner: this.options.owner,
        repo: this.options.repo,
        error: errorMessage,
      };

      // Add response details if it's an axios error
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response?: { status: number; data: unknown };
        };
        errorInfo = {
          ...errorInfo,
          statusCode: axiosError.response?.status,
          responsePreview:
            typeof axiosError.response?.data === 'string'
              ? axiosError.response.data.substring(0, 100) +
                (axiosError.response.data.length > 100 ? '...' : '')
              : 'Non-string response',
        };
      }

      this.logger.error('Failed to process GitLab webhook', errorInfo);
      throw new Error(`Failed to process GitLab webhook: ${errorMessage}`);
    }
  }
}
