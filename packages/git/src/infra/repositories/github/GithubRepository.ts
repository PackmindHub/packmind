import { IGitRepo } from '../../../domain/repositories/IGitRepo';
import axios, { AxiosInstance } from 'axios';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { GitCommit } from '@packmind/types';
import { GithubWebhookPushPayload } from '../../../domain/types/webhookPayloads';

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
    private readonly token: string,
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
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    this.logger.info('GithubRepository initialized successfully', {
      owner: this.options.owner,
      repo: this.options.repo,
    });
  }

  async commitFiles(
    files: { path: string; content: string }[],
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

      // Check if there are any actual changes to commit
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
            };
          }
        }),
      );

      // Check if there are any changes to commit (file modifications or deletions)
      const hasFileChanges = fileDifferenceCheck.some(
        (file) => file.hasChanges,
      );
      const hasDeletions = deleteFiles && deleteFiles.length > 0;
      const hasChanges = hasFileChanges || hasDeletions;

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

      // Step 1: Get the reference to the current branch
      this.logger.debug('Getting reference to branch', {
        owner,
        repo,
        branch: targetBranch,
      });

      const refResponse = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`,
      );

      const refSha = refResponse.data.object.sha;

      // Step 2: Get the commit that the reference points to
      this.logger.debug('Getting commit that reference points to', {
        owner,
        repo,
        refSha,
      });

      const commitResponse = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/git/commits/${refSha}`,
      );

      const baseTreeSha = commitResponse.data.tree.sha;

      // Step 3: Check if files exist and prepare tree items
      this.logger.debug('Checking file existence and preparing tree items', {
        owner,
        repo,
        baseTreeSha,
        fileCount: files.length,
      });

      // Check existence of each file and prepare tree items
      const treeItems: {
        path: string;
        mode: '100644';
        type: 'blob';
        content?: string;
        sha?: null;
      }[] = [];

      for (const file of files) {
        await this.getFileOnRepo(file.path, targetBranch);

        treeItems.push({
          path: file.path,
          mode: '100644', // Regular file mode
          type: 'blob',
          content: file.content,
        });
      }

      // Add delete items to tree (sha: null tells GitHub to delete the file)
      if (deleteFiles && deleteFiles.length > 0) {
        this.logger.info('Adding files for deletion to commit', {
          deleteFileCount: deleteFiles.length,
          owner,
          repo,
        });

        for (const file of deleteFiles) {
          treeItems.push({
            path: file.path,
            mode: '100644',
            type: 'blob',
            sha: null,
          });
        }
      }

      // Step 4: Create a new tree with all file changes
      this.logger.debug('Creating new tree with all file changes', {
        owner,
        repo,
        baseTreeSha,
        fileCount: files.length,
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

      // Step 5: Create a new commit pointing to the new tree
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

      // Step 6: Update the reference to point to the new commit
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

  isValidBranch(ref: string): boolean {
    // Extract branch name from ref (e.g., "refs/heads/main" -> "main")
    const branchName = ref.replace('refs/heads/', '');
    return branchName === 'main';
  }

  isPushEventFromWebhook(headers: Record<string, string>): boolean {
    const githubEvent = headers['x-github-event'];
    const isPushEvent = githubEvent === 'push';

    this.logger.debug('Checking if webhook is a push event', {
      eventType: githubEvent,
      isPushEvent,
    });

    return isPushEvent;
  }

  async getFileOnRepo(
    path: string,
    branch?: string,
  ): Promise<{ sha: string; content: string } | null> {
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
    this.logger.info('Processing GitHub webhook push payload', {
      owner: this.options.owner,
      repo: this.options.repo,
    });

    try {
      const pushPayload = payload as GithubWebhookPushPayload;

      // Handle missing or empty commits array gracefully
      if (!pushPayload.commits || !Array.isArray(pushPayload.commits)) {
        this.logger.info(
          'Webhook payload has no commits array - this could be a non-push event (e.g., repository creation, branch creation)',
          {
            owner: this.options.owner,
            repo: this.options.repo,
            ref: pushPayload.ref,
            hasCommits: !!pushPayload.commits,
            commitsType: typeof pushPayload.commits,
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
      const gitRepo = `https://github.com/${owner}/${repo}`;

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
      this.logger.debug('Fetching file contents from GitHub API');
      const filesWithContent = await Promise.all(
        Array.from(fileToLatestCommit.entries()).map(
          async ([filepath, { commitId, author, message }]) => {
            this.logger.debug('Fetching file content', { filepath, commitId });

            const response = await this.axiosInstance.get(
              `/repos/${owner}/${repo}/contents/${filepath}`,
              { params: { ref: commitId } },
            );

            // GitHub API returns base64 encoded content
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
      this.logger.error('Failed to process GitHub webhook', {
        owner: this.options.owner,
        repo: this.options.repo,
        error: errorMessage,
      });
      throw new Error(`Failed to process GitHub webhook: ${errorMessage}`);
    }
  }
}
