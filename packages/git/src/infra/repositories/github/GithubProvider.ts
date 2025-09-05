import { IGitProvider } from '../../../domain/repositories/IGitProvider';
import axios, { AxiosInstance } from 'axios';
import { PackmindLogger } from '@packmind/shared';
import { isNativeError } from 'util/types';

export class GithubProvider implements IGitProvider {
  private readonly client: AxiosInstance;

  constructor(
    private readonly token: string,
    private readonly logger: PackmindLogger,
  ) {
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
    });
  }

  async listAvailableRepositories(): Promise<
    {
      name: string;
      owner: string;
      description?: string;
      private: boolean;
      defaultBranch: string;
      language?: string;
      stars: number;
    }[]
  > {
    try {
      const response = await this.client.get('/user/repos', {
        params: {
          sort: 'updated',
          per_page: 100,
        },
      });

      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }

      return response.data
        .filter((repo) => repo && repo.name && repo.owner && repo.owner.login)
        .filter((repo) => {
          // Always filter for write-only repositories
          // Check if permissions object exists and has the push property
          if (!repo.permissions) {
            this.logger.warn(
              'Repository missing permissions object, excluding from results',
              {
                repoName: repo.name,
                owner: repo.owner?.login,
              },
            );
            return false;
          }

          if (typeof repo.permissions.push !== 'boolean') {
            this.logger.warn(
              'Repository permissions.push is not a boolean, excluding from results',
              {
                repoName: repo.name,
                owner: repo.owner?.login,
                pushValue: repo.permissions.push,
              },
            );
            return false;
          }

          return repo.permissions.push === true;
        })
        .map((repo) => ({
          name: repo.name,
          owner: repo.owner.login,
          description: repo.description || undefined,
          private: repo.private,
          defaultBranch: repo.default_branch,
          language: repo.language || undefined,
          stars: repo.stargazers_count,
        }));
    } catch (error) {
      this.logger.error('Failed to list available repositories', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to fetch repositories from GitHub');
    }
  }

  async checkBranchExists(
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean> {
    try {
      this.logger.debug('Checking if branch exists on GitHub', {
        owner,
        repo,
        branch,
      });

      await this.client.get(`/repos/${owner}/${repo}/branches/${branch}`);

      this.logger.debug('Branch exists on GitHub', { owner, repo, branch });
      return true;
    } catch (error) {
      if (isNativeError(error)) {
        // Check for specific GitHub API errors
        if (error.message.includes('404')) {
          this.logger.debug('Branch not found on GitHub', {
            owner,
            repo,
            branch,
          });
          return false;
        }
        if (error.message.includes('403')) {
          this.logger.error(
            'GitHub API rate limit exceeded or forbidden access',
            { owner, repo, branch, error },
          );
          throw new Error(
            'GitHub API rate limit exceeded or access forbidden. Please try again later.',
          );
        }
        if (error.message.includes('401')) {
          this.logger.error('GitHub API authentication failed', {
            owner,
            repo,
            branch,
            error,
          });
          throw new Error(
            'GitHub API authentication failed. Please check your token.',
          );
        }

        this.logger.error('Failed to check if branch exists on GitHub', {
          owner,
          repo,
          branch,
          error,
        });
        throw new Error(
          `Failed to check if branch exists for ${owner}/${repo}/${branch}: ${error.message}`,
        );
      }

      this.logger.error(
        'Failed to check if branch exists with unknown error type',
        { owner, repo, branch, error },
      );
      throw new Error(
        `Failed to check if branch exists for ${owner}/${repo}/${branch}, got error: ${error}`,
      );
    }
  }
}
