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
import { IGithubTokenResolver } from '../../../domain/repositories/IGithubTokenResolver';
import axios, { AxiosInstance, AxiosResponse, isAxiosError } from 'axios';
import { PackmindLogger } from '@packmind/logger';
import { isNativeError } from 'util/types';
import { collectAccessibleRepos } from '../collectAccessibleRepos';
import {
  PROVIDER_REQUEST_TIMEOUT_MS,
  withTransientRetry,
} from '../http/withTransientRetry';
import { providerHttpsAgent } from '../http/providerHttpAgent';
import { detectGithubRateLimit } from '../http/githubRateLimit';
import {
  GithubAvailableRepositoriesFailedError,
  GithubBranchExistenceCheckFailedError,
  GithubRateLimitedError,
} from '../../../domain/errors';

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
      timeout: PROVIDER_REQUEST_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      httpsAgent: providerHttpsAgent,
    });

    this.client.interceptors.request.use(async (config) => {
      const token = await resolver.getToken();
      config.headers['Authorization'] = `token ${token}`;
      return config;
    });

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

      // Filtering out repos we lack write access to means a single provider
      // page can yield far fewer than REPOS_PER_PAGE results — sometimes just
      // one — so a batch spans as many provider pages as it needs, bounded.
      return await collectAccessibleRepos({
        startPage: page,
        logger: this.logger,
        targetCount: REPOS_PER_PAGE,
        fetchPage: async (currentPage) => {
          const { rawRepos, totalPages } =
            kind === 'installation'
              ? await this.fetchInstallationRepos(currentPage)
              : await this.fetchUserRepos(currentPage);

          return {
            repositories: this.mapAccessibleRepos(rawRepos, kind),
            totalPages,
          };
        },
      });
    } catch (error) {
      this.logger.error('Failed to list available repositories', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new GithubAvailableRepositoriesFailedError(error);
    }
  }

  private mapAccessibleRepos(
    rawRepos: unknown,
    kind: 'user' | 'installation',
  ): ExternalRepository[] {
    if (!Array.isArray(rawRepos)) {
      return [];
    }

    const baseRepos = rawRepos.filter(
      (repo) => repo && repo.name && repo.owner && repo.owner.login,
    );

    // `/user/repos` includes read-only repos the user merely has visibility
    // into, hence the `permissions.push` filter. `/installation/repositories`
    // is trusted as-is: GitHub already returns only repos the App was granted,
    // and its per-repo `permissions` does not reliably reflect the App's
    // contents:write grant, so the same filter would drop every one of them.
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

    return filteredRepos.map((repo) => ({
      name: repo.name,
      owner: repo.owner.login,
      description: repo.description || undefined,
      private: repo.private,
      defaultBranch: repo.default_branch,
      language: repo.language || undefined,
      stars: repo.stargazers_count,
    }));
  }

  private async fetchUserRepos(
    page: number,
  ): Promise<{ rawRepos: unknown; totalPages: number }> {
    const response = await withTransientRetry(
      () =>
        this.client.get('/user/repos', {
          params: {
            sort: 'updated',
            per_page: REPOS_PER_PAGE,
            page,
          },
        }),
      { logger: this.logger, label: `/user/repos page ${page}` },
    );
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
    const response = await withTransientRetry(
      () =>
        this.client.get('/installation/repositories', {
          params: {
            per_page: REPOS_PER_PAGE,
            page,
          },
        }),
      {
        logger: this.logger,
        label: `/installation/repositories page ${page}`,
      },
    );
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
      // The status, not the message: `error.message.includes('403')` matched
      // axios's default text and could not tell a throttle from a refusal,
      // which is why the failure it raised had to claim both at once.
      const rateLimit = detectGithubRateLimit(error);
      if (rateLimit) {
        this.logger.warn('GitHub is rate limiting us', {
          owner,
          repo,
          branch,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        });
        throw new GithubRateLimitedError(rateLimit.retryAfterSeconds, {
          owner,
          repo,
          branch,
        });
      }

      const status = isAxiosError(error) ? error.response?.status : undefined;

      if (status === 404) {
        this.logger.debug('Branch not found on GitHub', {
          owner,
          repo,
          branch,
        });
        return false;
      }

      if (status === 403) {
        this.logger.warn('GitHub refused access to the repository', {
          owner,
          repo,
          branch,
        });
        throw new GitRemoteAccessForbiddenError('GitHub', owner, repo, 'read');
      }

      if (status === 401) {
        this.logger.warn('GitHub rejected the stored credentials', {
          owner,
          repo,
          branch,
        });
        throw new InvalidGitProviderCredentialsError(
          'GitHub API authentication failed. Please check your token.',
        );
      }

      this.logger.warn('Failed to check if branch exists on GitHub', {
        owner,
        repo,
        branch,
        error: isNativeError(error) ? error.message : String(error),
      });
      throw new GithubBranchExistenceCheckFailedError(
        owner,
        repo,
        branch,
        error,
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
  // GitHub returns 403 both for permission denials and for a spent quota;
  // `detectGithubRateLimit` owns that distinction, here and at the throw
  // sites, so there is one reading of the headers rather than two.
  if (detectGithubRateLimit(error)) return 'rate_limited';
  const status = error.response?.status;
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  return 'network';
}
