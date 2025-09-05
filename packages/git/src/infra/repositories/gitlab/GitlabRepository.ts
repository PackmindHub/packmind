import { IGitRepo } from '../../../domain/repositories/IGitRepo';
import axios, { AxiosInstance } from 'axios';
import { PackmindLogger, LogLevel } from '@packmind/shared';
import { GitCommit } from '../../../domain/entities/GitCommit';
import { GitlabRepositoryOptions, GitlabWebhookPushPayload } from './types';

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
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
    baseUrl?: string,
  ) {
    this.logger.info('Initializing GitlabRepository', {
      owner: options.owner,
      repo: options.repo,
      branch: options.branch,
    });

    // Handle both cases: user enters base GitLab URL or full API URL
    const providedUrl =
      baseUrl || process.env['GITLAB_BASE_URL'] || 'https://gitlab.com';

    // If the URL already includes /api/v4, use it as-is, otherwise append it
    this.baseUrl = providedUrl.includes('/api/v4')
      ? providedUrl
      : `${providedUrl.replace(/\/$/, '')}/api/v4`;
    // For GitLab, intelligently construct project path
    // If repo name has spaces, convert to kebab-case (GitLab standard)
    const normalizedRepo = options.repo.includes(' ')
      ? options.repo.toLowerCase().replace(/\s+/g, '-')
      : options.repo;

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

  async commitFiles(
    files: { path: string; content: string }[],
    commitMessage: string,
  ): Promise<Omit<GitCommit, 'id'>> {
    this.logger.info('Committing multiple files to GitLab repository', {
      fileCount: files.length,
      owner: this.options.owner,
      repo: this.options.repo,
    });

    if (files.length === 0) {
      throw new Error('No files to commit');
    }

    try {
      const { branch } = this.options;
      const targetBranch = branch || 'main';

      // Check file existence and prepare actions in one pass
      // For GitLab, we need to determine the correct action (create vs update) for each file
      let fileDifferenceCheck;
      let actions;

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

      // Check if there are any changes to commit
      const hasChanges = fileDifferenceCheck.some((file) => file.hasChanges);

      if (!hasChanges) {
        this.logger.info('No changes detected, skipping commit', {
          fileCount: files.length,
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
