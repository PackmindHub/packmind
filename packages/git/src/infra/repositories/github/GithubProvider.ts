import {
  CheckAuthFailureReason,
  CheckAuthResult,
  IGitProvider,
  ListAvailableRepositoriesResult,
} from '../../../domain/repositories/IGitProvider';
import { IGithubTokenResolver } from '../../../domain/repositories/IGithubTokenResolver';
import axios, { AxiosInstance, AxiosResponse, isAxiosError } from 'axios';
import { PackmindLogger } from '@packmind/logger';
import { isNativeError } from 'util/types';

const origin = 'GithubProvider';

const REPOS_PER_PAGE = 100;

export class GithubProvider implements IGitProvider {
  private readonly client: AxiosInstance;

  constructor(
    private readonly resolver: IGithubTokenResolver,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    // Inject token from resolver on every request
    this.client.interceptors.request.use(async (config) => {
      const token = await resolver.getToken();
      config.headers['Authorization'] = `token ${token}`;
      return config;
    });

    // Fire onUnauthorized hook on 401 responses
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error?.response?.status === 401) {
          await resolver.onUnauthorized();
        }
        return Promise.reject(error);
      },
    );
  }

  async listAvailableRepositories(
    page = 1,
  ): Promise<ListAvailableRepositoriesResult> {
    try {
      // Installation tokens authenticate as the App installation, not a user,
      // so `/user/repos` returns nothing. GitHub returns the same repo shape
      // from both endpoints, only the envelope differs (array vs.
      // `{ repositories: [...] }`).
      const kind = this.resolver.getKind();
      const { rawRepos, totalPages } =
        kind === 'installation'
          ? await this.fetchInstallationRepos(page)
          : await this.fetchUserRepos(page);

      if (!Array.isArray(rawRepos)) {
        return { repositories: [], totalPages: 1 };
      }

      const baseRepos = rawRepos.filter(
        (repo) => repo && repo.name && repo.owner && repo.owner.login,
      );

      // For `/user/repos` the response includes read-only repos the user has
      // visibility into, so we filter by `permissions.push === true`.
      // For `/installation/repositories` GitHub already only returns repos
      // the App was explicitly granted access to. The per-repo `permissions`
      // object for installation tokens does not reliably reflect the App's
      // contents:write grant (e.g. `push` may be false or absent), so the
      // same filter would silently drop every repo — the bug we are fixing.
      // Trust the App-installation list as-is.
      const filteredRepos =
        kind === 'installation'
          ? baseRepos
          : baseRepos.filter((repo) => {
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
            });

      const repositories = filteredRepos.map((repo) => ({
        name: repo.name,
        owner: repo.owner.login,
        description: repo.description || undefined,
        private: repo.private,
        defaultBranch: repo.default_branch,
        language: repo.language || undefined,
        stars: repo.stargazers_count,
      }));

      return { repositories, totalPages };
    } catch (error) {
      this.logger.error('Failed to list available repositories', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to fetch repositories from GitHub');
    }
  }

  private async fetchUserRepos(
    page: number,
  ): Promise<{ rawRepos: unknown; totalPages: number }> {
    const response = await this.client.get('/user/repos', {
      params: {
        sort: 'updated',
        per_page: REPOS_PER_PAGE,
        page,
      },
    });
    // `/user/repos` has no total count in its body, so the page count comes
    // from the RFC 5988 `Link` header (`rel="last"`).
    return {
      rawRepos: response.data,
      totalPages: totalPagesFromLinkHeader(response, page),
    };
  }

  private async fetchInstallationRepos(
    page: number,
  ): Promise<{ rawRepos: unknown; totalPages: number }> {
    const response = await this.client.get('/installation/repositories', {
      params: {
        per_page: REPOS_PER_PAGE,
        page,
      },
    });
    // The installation endpoint reports `total_count`, so we can derive the
    // page count directly rather than parsing the `Link` header.
    const totalCount = response.data?.total_count;
    const totalPages =
      typeof totalCount === 'number' && totalCount > 0
        ? Math.ceil(totalCount / REPOS_PER_PAGE)
        : 1;
    return { rawRepos: response.data?.repositories, totalPages };
  }

  async checkAuth(): Promise<CheckAuthResult> {
    // Probe a cheap endpoint that reflects the same auth path as real calls:
    // - PAT: `/user` returns the authenticated user (no repos fetched).
    // - Installation: `/installation/repositories?per_page=1` exercises the
    //   installation token without paginating the full list.
    const kind = this.resolver.getKind();
    const probe =
      kind === 'installation'
        ? { url: '/installation/repositories', params: { per_page: 1 } }
        : { url: '/user', params: undefined };

    try {
      await this.client.get(probe.url, { params: probe.params });
      return { ok: true };
    } catch (error) {
      const reason = mapGithubAuthError(error);
      this.logger.warn('GitHub auth check failed', {
        kind,
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

// Extract the last-page number from GitHub's `Link` header, e.g.
// `<https://api.github.com/user/repos?page=3&per_page=100>; rel="last"`.
// When absent (single page) the current page is the last one.
function totalPagesFromLinkHeader(
  response: AxiosResponse,
  currentPage: number,
): number {
  const link = response.headers?.['link'] ?? response.headers?.['Link'];
  if (typeof link !== 'string') {
    return currentPage;
  }

  const lastMatch = link
    .split(',')
    .map((part) => part.trim())
    .find((part) => /rel="last"/.test(part));
  if (!lastMatch) {
    return currentPage;
  }

  const pageMatch = lastMatch.match(/[?&]page=(\d+)/);
  const lastPage = pageMatch ? Number(pageMatch[1]) : NaN;
  return Number.isFinite(lastPage) && lastPage > 0 ? lastPage : currentPage;
}

function mapGithubAuthError(error: unknown): CheckAuthFailureReason {
  if (!isAxiosError(error)) return 'network';
  const status = error.response?.status;
  if (status === 401) return 'unauthorized';
  if (status === 429) return 'rate_limited';
  if (status === 403) {
    // GitHub returns 403 both for permission denials and for primary rate
    // limit exhaustion; the latter is signalled by `x-ratelimit-remaining: 0`.
    const remaining = error.response?.headers?.['x-ratelimit-remaining'];
    if (remaining === '0' || remaining === 0) return 'rate_limited';
    return 'forbidden';
  }
  return 'network';
}
