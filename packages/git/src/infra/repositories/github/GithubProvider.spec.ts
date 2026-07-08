import axios from 'axios';
import { GithubProvider } from './GithubProvider';
import { IGithubTokenResolver } from '../../../domain/repositories/IGithubTokenResolver';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const stubResolver = (
  kind: 'user' | 'installation' = 'user',
): IGithubTokenResolver => ({
  getToken: jest.fn().mockResolvedValue('fake-token'),
  onUnauthorized: jest.fn().mockResolvedValue(undefined),
  getKind: jest.fn().mockReturnValue(kind),
});

describe('GithubProvider', () => {
  let githubProvider: GithubProvider;
  let mockLogger: jest.Mocked<PackmindLogger>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAxiosInstance: jest.Mocked<any>;

  beforeEach(() => {
    mockLogger = stubLogger();

    mockAxiosInstance = {
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    (mockedAxios.isAxiosError as unknown as jest.Mock).mockImplementation(
      (payload) =>
        typeof payload === 'object' &&
        payload !== null &&
        (payload as { isAxiosError?: boolean }).isAxiosError === true,
    );

    githubProvider = new GithubProvider(stubResolver(), mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listAvailableRepositories', () => {
    describe('when API call succeeds', () => {
      let result: Awaited<
        ReturnType<typeof githubProvider.listAvailableRepositories>
      >;

      beforeEach(async () => {
        const mockResponse = {
          data: [
            {
              name: 'test-repo',
              owner: { login: 'test-owner' },
              description: 'Test repository',
              private: false,
              default_branch: 'main',
              language: 'TypeScript',
              stargazers_count: 42,
              permissions: {
                pull: true,
                push: true,
                admin: false,
              },
            },
            {
              name: 'another-repo',
              owner: { login: 'test-owner' },
              description: null,
              private: true,
              default_branch: 'master',
              language: null,
              stargazers_count: 0,
              permissions: {
                pull: true,
                push: true,
                admin: false,
              },
            },
          ],
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        result = await githubProvider.listAvailableRepositories();
      });

      it('calls the correct API endpoint with expected parameters', () => {
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/user/repos', {
          params: {
            sort: 'updated',
            per_page: 100,
            page: 1,
          },
        });
      });

      it('returns formatted repository list', () => {
        expect(result.repositories).toEqual([
          {
            name: 'test-repo',
            owner: 'test-owner',
            description: 'Test repository',
            private: false,
            defaultBranch: 'main',
            language: 'TypeScript',
            stars: 42,
          },
          {
            name: 'another-repo',
            owner: 'test-owner',
            description: undefined,
            private: true,
            defaultBranch: 'master',
            language: undefined,
            stars: 0,
          },
        ]);
      });
    });

    it('filters out invalid repository data', async () => {
      const mockResponse = {
        data: [
          {
            name: 'valid-repo',
            owner: { login: 'test-owner' },
            description: 'Valid repository',
            private: false,
            default_branch: 'main',
            language: 'TypeScript',
            stargazers_count: 5,
            permissions: {
              pull: true,
              push: true,
              admin: false,
            },
          },
          {
            // Invalid: missing name
            owner: { login: 'test-owner' },
            description: 'Invalid repository',
          },
          {
            name: 'invalid-repo',
            // Invalid: missing owner
            description: 'Invalid repository',
          },
          null, // Invalid: null entry
        ],
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await githubProvider.listAvailableRepositories();

      expect(result.repositories).toEqual([
        {
          name: 'valid-repo',
          owner: 'test-owner',
          description: 'Valid repository',
          private: false,
          defaultBranch: 'main',
          language: 'TypeScript',
          stars: 5,
        },
      ]);
    });

    describe('when response data is not an array', () => {
      it('returns empty array', async () => {
        const mockResponse = { data: null };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await githubProvider.listAvailableRepositories();

        expect(result.repositories).toEqual([]);
      });
    });

    describe('pagination', () => {
      it('requests the given page', async () => {
        mockAxiosInstance.get.mockResolvedValue({ data: [] });

        await githubProvider.listAvailableRepositories(3);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/user/repos', {
          params: { sort: 'updated', per_page: 100, page: 3 },
        });
      });

      describe('when the Link header advertises more pages', () => {
        it('reports the last page as the total', async () => {
          mockAxiosInstance.get.mockResolvedValue({
            data: [],
            headers: {
              link: '<https://api.github.com/user/repos?page=2&per_page=100>; rel="next", <https://api.github.com/user/repos?page=5&per_page=100>; rel="last"',
            },
          });

          const result = await githubProvider.listAvailableRepositories(1);

          expect(result.totalPages).toBe(5);
        });
      });

      describe('when there is no Link header', () => {
        it('reports the current page as the total', async () => {
          mockAxiosInstance.get.mockResolvedValue({ data: [] });

          const result = await githubProvider.listAvailableRepositories(2);

          expect(result.totalPages).toBe(2);
        });
      });

      describe('with an installation token', () => {
        it('derives the total page count from total_count', async () => {
          const installationProvider = new GithubProvider(
            stubResolver('installation'),
            mockLogger,
          );
          mockAxiosInstance.get.mockResolvedValue({
            data: { total_count: 250, repositories: [] },
          });

          const result =
            await installationProvider.listAvailableRepositories(1);

          expect(result.totalPages).toBe(3);
        });
      });
    });

    describe('when API call fails', () => {
      it('throws error', async () => {
        const mockError = new Error('Network error');
        mockAxiosInstance.get.mockRejectedValue(mockError);

        await expect(
          githubProvider.listAvailableRepositories(),
        ).rejects.toThrow('Failed to fetch repositories from GitHub');
      });
    });

    it('throws error with generic message for non-Error objects', async () => {
      const mockError = 'String error';
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(githubProvider.listAvailableRepositories()).rejects.toThrow(
        'Failed to fetch repositories from GitHub',
      );
    });

    describe('with default filtering', () => {
      it('returns only repositories with write access by default', async () => {
        const mockResponse = {
          data: [
            {
              name: 'writable-repo',
              owner: { login: 'test-owner' },
              description: 'Repository with write access',
              private: false,
              default_branch: 'main',
              language: 'TypeScript',
              stargazers_count: 42,
              permissions: {
                pull: true,
                push: true,
                admin: false,
              },
            },
            {
              name: 'readonly-repo',
              owner: { login: 'test-owner' },
              description: 'Repository without write access',
              private: false,
              default_branch: 'main',
              language: 'JavaScript',
              stargazers_count: 5,
              permissions: {
                pull: true,
                push: false,
                admin: false,
              },
            },
          ],
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await githubProvider.listAvailableRepositories();

        expect(result.repositories).toEqual([
          {
            name: 'writable-repo',
            owner: 'test-owner',
            description: 'Repository with write access',
            private: false,
            defaultBranch: 'main',
            language: 'TypeScript',
            stars: 42,
          },
        ]);
      });

      describe('when permissions object is missing', () => {
        it('excludes repositories and logs warning', async () => {
          const mockResponse = {
            data: [
              {
                name: 'repo-without-permissions',
                owner: { login: 'test-owner' },
                description: 'Repository missing permissions',
                private: false,
                default_branch: 'main',
                language: 'TypeScript',
                stargazers_count: 42,
                // No permissions object
              },
              {
                name: 'repo-with-permissions',
                owner: { login: 'test-owner' },
                description: 'Repository with permissions',
                private: false,
                default_branch: 'main',
                language: 'JavaScript',
                stargazers_count: 5,
                permissions: {
                  pull: true,
                  push: true,
                  admin: false,
                },
              },
            ],
          };

          mockAxiosInstance.get.mockResolvedValue(mockResponse);

          const result = await githubProvider.listAvailableRepositories();

          expect(result.repositories).toEqual([
            {
              name: 'repo-with-permissions',
              owner: 'test-owner',
              description: 'Repository with permissions',
              private: false,
              defaultBranch: 'main',
              language: 'JavaScript',
              stars: 5,
            },
          ]);
        });
      });

      describe('when permissions.push is not a boolean', () => {
        it('excludes repositories and logs warning', async () => {
          const mockResponse = {
            data: [
              {
                name: 'repo-invalid-permissions',
                owner: { login: 'test-owner' },
                description: 'Repository with invalid permissions',
                private: false,
                default_branch: 'main',
                language: 'TypeScript',
                stargazers_count: 42,
                permissions: {
                  pull: true,
                  push: 'invalid', // Not a boolean
                  admin: false,
                },
              },
            ],
          };

          mockAxiosInstance.get.mockResolvedValue(mockResponse);

          const result = await githubProvider.listAvailableRepositories();

          expect(result.repositories).toEqual([]);
        });
      });
    });

    describe('with installation token resolver', () => {
      let installationProvider: GithubProvider;

      beforeEach(() => {
        installationProvider = new GithubProvider(
          stubResolver('installation'),
          mockLogger,
        );
      });

      describe('when API call succeeds', () => {
        let result: Awaited<
          ReturnType<typeof installationProvider.listAvailableRepositories>
        >;

        beforeEach(async () => {
          const mockResponse = {
            data: {
              total_count: 1,
              repositories: [
                {
                  name: 'app-repo',
                  owner: { login: 'app-owner' },
                  description: 'App-installed repository',
                  private: true,
                  default_branch: 'main',
                  language: 'TypeScript',
                  stargazers_count: 7,
                  permissions: {
                    pull: true,
                    push: true,
                    admin: false,
                  },
                },
              ],
            },
          };

          mockAxiosInstance.get.mockResolvedValue(mockResponse);

          result = await installationProvider.listAvailableRepositories();
        });

        it('calls /installation/repositories', () => {
          expect(mockAxiosInstance.get).toHaveBeenCalledWith(
            '/installation/repositories',
            {
              params: {
                per_page: 100,
                page: 1,
              },
            },
          );
        });

        it('unwraps the repositories envelope and returns formatted list', () => {
          expect(result.repositories).toEqual([
            {
              name: 'app-repo',
              owner: 'app-owner',
              description: 'App-installed repository',
              private: true,
              defaultBranch: 'main',
              language: 'TypeScript',
              stars: 7,
            },
          ]);
        });
      });

      describe('when repositories field is missing', () => {
        it('returns empty array', async () => {
          mockAxiosInstance.get.mockResolvedValue({ data: { total_count: 0 } });

          const result = await installationProvider.listAvailableRepositories();

          expect(result.repositories).toEqual([]);
        });
      });

      describe('when repos have permissions.push false or absent', () => {
        // For installation tokens, GitHub's per-repo `permissions` object does
        // not reliably mirror the App's `contents:write` grant. The user-token
        // filter would drop every repo; the installation path must keep them.
        it('returns the repos without filtering by permissions.push', async () => {
          mockAxiosInstance.get.mockResolvedValue({
            data: {
              total_count: 2,
              repositories: [
                {
                  name: 'app-repo-no-perms',
                  owner: { login: 'app-owner' },
                  description: null,
                  private: true,
                  default_branch: 'main',
                  language: null,
                  stargazers_count: 0,
                  // No permissions object at all.
                },
                {
                  name: 'app-repo-push-false',
                  owner: { login: 'app-owner' },
                  description: null,
                  private: false,
                  default_branch: 'main',
                  language: null,
                  stargazers_count: 0,
                  permissions: { pull: true, push: false, admin: false },
                },
              ],
            },
          });

          const result = await installationProvider.listAvailableRepositories();

          expect(result.repositories.map((r) => r.name)).toEqual([
            'app-repo-no-perms',
            'app-repo-push-false',
          ]);
        });
      });

      describe('when API call fails', () => {
        it('throws error', async () => {
          mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

          await expect(
            installationProvider.listAvailableRepositories(),
          ).rejects.toThrow('Failed to fetch repositories from GitHub');
        });
      });
    });
  });

  describe('checkAuth', () => {
    const buildAxiosError = (
      status: number,
      headers: Record<string, string | number> = {},
    ) => {
      const err = new Error(
        `Request failed with status code ${status}`,
      ) as Error & {
        isAxiosError: true;
        response: { status: number; headers: Record<string, string | number> };
      };
      err.isAxiosError = true;
      err.response = { status, headers };
      return err;
    };

    describe('with PAT resolver', () => {
      it('probes /user', async () => {
        mockAxiosInstance.get.mockResolvedValue({ data: { login: 'me' } });

        await githubProvider.checkAuth();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/user', {
          params: undefined,
        });
      });

      it('returns ok on 200', async () => {
        mockAxiosInstance.get.mockResolvedValue({ data: { login: 'me' } });

        const result = await githubProvider.checkAuth();

        expect(result).toEqual({ ok: true });
      });

      it('maps 401 to unauthorized', async () => {
        mockAxiosInstance.get.mockRejectedValue(buildAxiosError(401));

        const result = await githubProvider.checkAuth();

        expect(result).toEqual({ ok: false, reason: 'unauthorized' });
      });

      it('maps 403 with x-ratelimit-remaining: 0 to rate_limited', async () => {
        mockAxiosInstance.get.mockRejectedValue(
          buildAxiosError(403, { 'x-ratelimit-remaining': '0' }),
        );

        const result = await githubProvider.checkAuth();

        expect(result).toEqual({ ok: false, reason: 'rate_limited' });
      });

      it('maps plain 403 to forbidden', async () => {
        mockAxiosInstance.get.mockRejectedValue(buildAxiosError(403));

        const result = await githubProvider.checkAuth();

        expect(result).toEqual({ ok: false, reason: 'forbidden' });
      });

      it('maps 429 to rate_limited', async () => {
        mockAxiosInstance.get.mockRejectedValue(buildAxiosError(429));

        const result = await githubProvider.checkAuth();

        expect(result).toEqual({ ok: false, reason: 'rate_limited' });
      });

      it('maps non-axios errors to network', async () => {
        mockAxiosInstance.get.mockRejectedValue(new Error('boom'));

        const result = await githubProvider.checkAuth();

        expect(result).toEqual({ ok: false, reason: 'network' });
      });

      it('maps unexpected statuses to network', async () => {
        mockAxiosInstance.get.mockRejectedValue(buildAxiosError(500));

        const result = await githubProvider.checkAuth();

        expect(result).toEqual({ ok: false, reason: 'network' });
      });
    });

    describe('with installation resolver', () => {
      let installationProvider: GithubProvider;

      beforeEach(() => {
        installationProvider = new GithubProvider(
          stubResolver('installation'),
          mockLogger,
        );
      });

      it('probes /installation/repositories with per_page=1', async () => {
        mockAxiosInstance.get.mockResolvedValue({
          data: { total_count: 0, repositories: [] },
        });

        await installationProvider.checkAuth();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          '/installation/repositories',
          { params: { per_page: 1 } },
        );
      });

      it('returns ok on 200', async () => {
        mockAxiosInstance.get.mockResolvedValue({
          data: { total_count: 0, repositories: [] },
        });

        const result = await installationProvider.checkAuth();

        expect(result).toEqual({ ok: true });
      });

      it('maps 401 to unauthorized', async () => {
        mockAxiosInstance.get.mockRejectedValue(buildAxiosError(401));

        const result = await installationProvider.checkAuth();

        expect(result).toEqual({ ok: false, reason: 'unauthorized' });
      });
    });
  });

  describe('checkBranchExists', () => {
    const owner = 'test-owner';
    const repo = 'test-repo';
    const branch = 'main';

    describe('when branch exists', () => {
      let result: boolean;

      beforeEach(async () => {
        const mockResponse = {
          data: {
            name: 'main',
            commit: { sha: 'abc123' },
            protected: false,
          },
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        result = await githubProvider.checkBranchExists(owner, repo, branch);
      });

      it('calls the correct API endpoint', () => {
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          `/repos/${owner}/${repo}/branches/${branch}`,
        );
      });

      it('returns true', () => {
        expect(result).toBe(true);
      });
    });

    describe('when branch does not exist (404)', () => {
      it('returns false', async () => {
        const mockError = new Error('Request failed with status code 404');
        mockAxiosInstance.get.mockRejectedValue(mockError);

        const result = await githubProvider.checkBranchExists(
          owner,
          repo,
          branch,
        );

        expect(result).toBe(false);
      });
    });

    it('throws specific error for 403 (rate limit or forbidden)', async () => {
      const mockError = new Error('Request failed with status code 403');
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(
        githubProvider.checkBranchExists(owner, repo, branch),
      ).rejects.toThrow(
        'GitHub API rate limit exceeded or access forbidden. Please try again later.',
      );
    });

    it('throws specific error for 401 (unauthorized)', async () => {
      const mockError = new Error('Request failed with status code 401');
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(
        githubProvider.checkBranchExists(owner, repo, branch),
      ).rejects.toThrow(
        'GitHub API authentication failed. Please check your token.',
      );
    });

    it('throws generic error for other failures', async () => {
      const mockError = new Error('Request failed with status code 500');
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(
        githubProvider.checkBranchExists(owner, repo, branch),
      ).rejects.toThrow(
        `Failed to check if branch exists for ${owner}/${repo}/${branch}: Request failed with status code 500`,
      );
    });

    it('throws error with generic message for non-Error objects', async () => {
      const mockError = 'String error';
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(
        githubProvider.checkBranchExists(owner, repo, branch),
      ).rejects.toThrow(
        `Failed to check if branch exists for ${owner}/${repo}/${branch}, got error: String error`,
      );
    });
  });
});
