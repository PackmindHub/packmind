import { IGitProvider } from '../../../domain/repositories/IGitProvider';
import axios, { AxiosInstance } from 'axios';
import { PackmindLogger } from '@packmind/logger';
import { isNativeError } from 'util/types';
import { GitlabProject, MIN_PUSH_ACCESS_LEVEL } from './types';

const origin = 'GitlabProvider';

export class GitlabProvider implements IGitProvider {
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;

  constructor(
    private readonly token: string,
    baseUrl?: string,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    // Handle both cases: user enters base GitLab URL or full API URL
    const providedUrl =
      baseUrl || process.env['GITLAB_BASE_URL'] || 'https://gitlab.com';

    // If the URL already includes /api/v4, use it as-is, otherwise append it
    this.baseUrl = providedUrl.includes('/api/v4')
      ? providedUrl
      : `${providedUrl.replace(/\/$/, '')}/api/v4`;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'PRIVATE-TOKEN': this.token, // Use header authentication as shown in GitLab API docs
      },
      // GitLab API documentation shows PRIVATE-TOKEN header authentication
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
      this.logger.debug('Fetching GitLab projects');

      // Try different approaches to get projects, starting with membership

      // Use the same approach as the working GitLab provider
      const response = await this.client.get('/projects', {
        params: {
          membership: true,
          archived: false,
          order_by: 'last_activity_at', // Use last_activity_at like the working example
          per_page: 100,
        },
      });

      this.logger.debug('GitLab API response received', {
        projectCount: response.data?.length || 0,
      });

      if (!response.data || !Array.isArray(response.data)) {
        this.logger.warn('GitLab API returned no data or non-array data');
        return [];
      }

      this.logger.debug('Processing GitLab projects', {
        totalProjects: response.data.length,
      });

      // First filter: basic project validation
      const validProjects = response.data.filter((project: GitlabProject) => {
        const isValid = project && project.name && project.namespace;
        if (!isValid) {
          this.logger.debug('Invalid project structure found', {
            projectId: project?.id,
          });
        }
        return isValid;
      });

      this.logger.debug('Valid projects after basic filtering', {
        validCount: validProjects.length,
      });

      // Filter projects by write access - write access is mandatory
      const accessibleProjects = validProjects.filter(
        (project: GitlabProject) => {
          // Check access level for push permissions
          const projectAccess =
            project.permissions?.project_access?.access_level || 0;
          const groupAccess =
            project.permissions?.group_access?.access_level || 0;
          const maxAccessLevel = Math.max(projectAccess, groupAccess);

          this.logger.debug('Checking project access level', {
            projectName: project.name,
            accessLevel: maxAccessLevel,
            requiredLevel: MIN_PUSH_ACCESS_LEVEL,
          });

          // If no permissions object is present, exclude the project for security
          // This ensures we only work with repositories where permissions are clearly defined
          if (!project.permissions) {
            this.logger.debug(
              'Project has no permissions object, excluding from results',
              {
                projectName: project.name,
              },
            );
            return false;
          }

          if (maxAccessLevel < MIN_PUSH_ACCESS_LEVEL) {
            this.logger.debug(
              'Project excluded due to insufficient access level',
              {
                projectName: project.name,
                accessLevel: maxAccessLevel,
                requiredLevel: MIN_PUSH_ACCESS_LEVEL,
              },
            );
            return false;
          }

          this.logger.debug('Project included', {
            projectName: project.name,
            accessLevel: maxAccessLevel,
          });

          return true;
        },
      );

      this.logger.debug('Accessible projects after access filtering', {
        accessibleCount: accessibleProjects.length,
      });

      const mappedProjects = accessibleProjects.map(
        (project: GitlabProject) => {
          // Extract owner from path_with_namespace by removing the project name
          // e.g., "promyze/sandbox/protomind" -> owner: "promyze/sandbox", name: "protomind"
          const pathParts = project.path_with_namespace.split('/');
          const projectPathName = pathParts.pop(); // Remove and get the last part (URL-friendly project name)
          const ownerPath = pathParts.join('/'); // Join the remaining parts as the owner

          this.logger.debug('Mapping GitLab project', {
            displayName: project.name,
            pathWithNamespace: project.path_with_namespace,
            extractedOwner: ownerPath,
            extractedRepo: projectPathName,
          });

          return {
            name: projectPathName || project.name, // Use path-friendly name from path_with_namespace
            owner: ownerPath, // Use the full namespace path as owner
            description: project.description || undefined,
            private: project.visibility !== 'public',
            defaultBranch: project.default_branch,
            language: undefined, // GitLab API doesn't provide primary language in projects list
            stars: project.star_count,
          };
        },
      );

      this.logger.info('GitLab projects retrieved successfully', {
        totalCount: mappedProjects.length,
      });

      return mappedProjects;
    } catch (error) {
      this.logger.error('Failed to list available repositories', {
        error: error instanceof Error ? error.message : String(error),
        baseUrl: this.baseUrl,
      });
      throw new Error('Failed to fetch repositories from GitLab');
    }
  }

  async checkBranchExists(
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean> {
    try {
      this.logger.debug('Checking if branch exists on GitLab', {
        owner,
        repo,
        branch,
      });

      // GitLab uses project path format: owner/repo
      const projectPath = `${owner}/${repo}`;
      const encodedPath = encodeURIComponent(projectPath);

      await this.client.get(
        `/projects/${encodedPath}/repository/branches/${encodeURIComponent(branch)}`,
      );

      this.logger.debug('Branch exists on GitLab', { owner, repo, branch });
      return true;
    } catch (error) {
      if (isNativeError(error)) {
        // Check for specific GitLab API errors
        if (error.message.includes('404')) {
          this.logger.debug('Branch not found on GitLab', {
            owner,
            repo,
            branch,
          });
          return false;
        }
        if (error.message.includes('403')) {
          this.logger.error(
            'GitLab API rate limit exceeded or forbidden access',
            { owner, repo, branch, error },
          );
          throw new Error(
            'GitLab API rate limit exceeded or access forbidden. Please try again later.',
          );
        }
        if (error.message.includes('401')) {
          this.logger.error('GitLab API authentication failed', {
            owner,
            repo,
            branch,
            error,
          });
          throw new Error(
            'GitLab API authentication failed. Please check your token.',
          );
        }

        this.logger.error('Failed to check if branch exists on GitLab', {
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
