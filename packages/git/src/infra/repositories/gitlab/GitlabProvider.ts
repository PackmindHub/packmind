import {
  CheckAuthFailureReason,
  CheckAuthResult,
  IGitProvider,
  ListAvailableRepositoriesResult,
} from '../../../domain/repositories/IGitProvider';
import {
  ExternalRepository,
  GitRemoteAccessForbiddenError,
  InvalidGitProviderCredentialsError,
} from '@packmind/types';
import axios, { AxiosInstance, isAxiosError } from 'axios';
import { PackmindLogger } from '@packmind/logger';
import { isNativeError } from 'util/types';
import { GitlabProject, MIN_PUSH_ACCESS_LEVEL } from './types';
import {
  PROVIDER_REQUEST_TIMEOUT_MS,
  withTransientRetry,
} from '../http/withTransientRetry';
import { providerHttpsAgent } from '../http/providerHttpAgent';
import { collectAccessibleRepos } from '../collectAccessibleRepos';
import { gitlabRateLimitedError } from '../http/gitlabRateLimit';
import {
  GitlabAvailableRepositoriesFailedError,
  GitlabBranchExistenceCheckFailedError,
} from '../../../domain/errors';

const origin = 'GitlabProvider';

const PROJECTS_PER_PAGE = 100;

export class GitlabProvider implements IGitProvider {
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;

  constructor(
    private readonly token: string,
    baseUrl?: string,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    // The configured URL may be either a GitLab base URL or a full API URL.
    const providedUrl =
      baseUrl || process.env['GITLAB_BASE_URL'] || 'https://gitlab.com';

    this.baseUrl = providedUrl.includes('/api/v4')
      ? providedUrl
      : `${providedUrl.replace(/\/$/, '')}/api/v4`;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: PROVIDER_REQUEST_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        'PRIVATE-TOKEN': this.token, // Use header authentication as shown in GitLab API docs
      },
      httpsAgent: providerHttpsAgent,
    });
  }

  async listAvailableRepositories(
    page = 1,
  ): Promise<ListAvailableRepositoriesResult> {
    try {
      this.logger.debug('Fetching GitLab projects');

      // Filtering out projects we lack write access to means a single provider
      // page can yield far fewer than PROJECTS_PER_PAGE results, so a batch
      // spans as many provider pages as it needs, bounded.
      const result = await collectAccessibleRepos({
        startPage: page,
        logger: this.logger,
        targetCount: PROJECTS_PER_PAGE,
        fetchPage: async (currentPage) => {
          const { rawProjects, totalPages } =
            await this.fetchProjectsPage(currentPage);

          return {
            repositories: this.mapAccessibleProjects(rawProjects),
            totalPages,
          };
        },
      });

      this.logger.info('GitLab projects retrieved successfully', {
        totalCount: result.repositories.length,
        partial: result.partial,
      });

      return result;
    } catch (error) {
      const throttled = gitlabRateLimitedError(error, {
        operation: 'list available repositories',
      });
      if (throttled) throw throttled;

      this.logger.error('Failed to list available repositories', {
        error: error instanceof Error ? error.message : String(error),
        baseUrl: this.baseUrl,
      });
      throw new GitlabAvailableRepositoriesFailedError(error);
    }
  }

  private async fetchProjectsPage(
    page: number,
  ): Promise<{ rawProjects: unknown; totalPages: number }> {
    // `membership: true` is what scopes the listing to the token's own
    // projects rather than every public project on the instance.
    const response = await withTransientRetry(
      () =>
        this.client.get('/projects', {
          params: {
            membership: true,
            archived: false,
            order_by: 'last_activity_at',
            per_page: PROJECTS_PER_PAGE,
            page,
          },
        }),
      { logger: this.logger, label: `/projects page ${page}` },
    );

    this.logger.debug('GitLab API response received', {
      projectCount: response.data?.length || 0,
    });

    // GitLab reports the page count in the `x-total-pages` header.
    return {
      rawProjects: response.data,
      totalPages: totalPagesFromHeader(response.headers, page),
    };
  }

  // Validates, access-filters and maps one raw provider page into the shared
  // ExternalRepository shape.
  private mapAccessibleProjects(rawProjects: unknown): ExternalRepository[] {
    if (!rawProjects || !Array.isArray(rawProjects)) {
      this.logger.warn('GitLab API returned no data or non-array data');
      return [];
    }

    this.logger.debug('Processing GitLab projects', {
      totalProjects: rawProjects.length,
    });

    // First filter: basic project validation
    const validProjects = rawProjects.filter((project: GitlabProject) => {
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

    return accessibleProjects.map((project: GitlabProject) => {
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
    });
  }

  async checkAuth(): Promise<CheckAuthResult> {
    try {
      await this.client.get('/user');
      return { ok: true };
    } catch (error) {
      const reason = mapGitlabAuthError(error);
      this.logger.warn('GitLab auth check failed', {
        reason,
        status: isAxiosError(error) ? error.response?.status : undefined,
      });
      return { ok: false, reason };
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
      // The status, not the message: `error.message.includes('403')` matched
      // axios's own "Request failed with status code 403" and would have
      // matched a branch name containing those digits just as happily.
      // Unlike GitHub, GitLab does not overload 403 — it throttles with a
      // 429 — so a 403 here is a refusal and nothing else, and there is no
      // header reading to do before believing it.
      const throttled = gitlabRateLimitedError(error, { owner, repo, branch });
      if (throttled) throw throttled;

      const status = isAxiosError(error) ? error.response?.status : undefined;

      if (status === 404) {
        this.logger.debug('Branch not found on GitLab', {
          owner,
          repo,
          branch,
        });
        return false;
      }

      if (status === 403) {
        this.logger.warn('GitLab refused access to the repository', {
          owner,
          repo,
          branch,
        });
        throw new GitRemoteAccessForbiddenError('GitLab', owner, repo, 'read');
      }

      if (status === 401) {
        this.logger.warn('GitLab rejected the stored credentials', {
          owner,
          repo,
          branch,
        });
        throw new InvalidGitProviderCredentialsError(
          'GitLab API authentication failed. Please check your token.',
        );
      }

      this.logger.warn('Failed to check if branch exists on GitLab', {
        owner,
        repo,
        branch,
        error: isNativeError(error) ? error.message : String(error),
      });
      throw new GitlabBranchExistenceCheckFailedError(
        owner,
        repo,
        branch,
        error,
      );
    }
  }
}

// GitLab returns the total page count in the `x-total-pages` response header.
// When it is missing or unparseable we fall back to the current page.
function totalPagesFromHeader(
  headers: Record<string, unknown> | undefined,
  currentPage: number,
): number {
  const raw = headers?.['x-total-pages'];
  const parsed =
    typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : currentPage;
}

function mapGitlabAuthError(error: unknown): CheckAuthFailureReason {
  if (!isAxiosError(error)) return 'network';
  const status = error.response?.status;
  if (status === 401) return 'unauthorized';
  if (status === 429) return 'rate_limited';
  if (status === 403) return 'forbidden';
  return 'network';
}
