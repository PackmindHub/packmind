import axios from 'axios';
import { GithubProvider, GithubAuthConfig } from './GithubProvider';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { createAppAuth } from '@octokit/auth-app';

jest.mock('axios');
jest.mock('@octokit/auth-app');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedCreateAppAuth = createAppAuth as jest.MockedFunction<
  typeof createAppAuth
>;

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
        request: {
          use: jest.fn((handler) => {
            mockAxiosInstance._requestInterceptor = handler;
            return 0;
          }),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('with token authentication', () => {
    beforeEach(() => {
      const authConfig: GithubAuthConfig = {
        type: 'token',
        token: 'fake-token',
      };
      githubProvider = new GithubProvider(authConfig, mockLogger);
    });

  describe('listAvailableRepositories', () => {
    describe('when API call succeeds', () => {
      it('returns formatted repository list', async () => {
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

        const result = await githubProvider.listAvailableRepositories();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/user/repos', {
          params: {
            sort: 'updated',
            per_page: 100,
          },
        });

        expect(result).toEqual([
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

      expect(result).toEqual([
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

        expect(result).toEqual([]);
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

        expect(result).toEqual([
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

          expect(result).toEqual([
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

          expect(result).toEqual([]);
        });
      });
    });
  });

  describe('checkBranchExists', () => {
    const owner = 'test-owner';
    const repo = 'test-repo';
    const branch = 'main';

    describe('when branch exists', () => {
      it('returns true', async () => {
        const mockResponse = {
          data: {
            name: 'main',
            commit: { sha: 'abc123' },
            protected: false,
          },
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await githubProvider.checkBranchExists(
          owner,
          repo,
          branch,
        );

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          `/repos/${owner}/${repo}/branches/${branch}`,
        );

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

  describe('with GitHub App authentication', () => {
    let mockAuth: jest.Mock;

    beforeEach(() => {
      mockAuth = jest.fn().mockResolvedValue({ token: 'app-installation-token' });
      mockedCreateAppAuth.mockReturnValue(mockAuth);

      const authConfig: GithubAuthConfig = {
        type: 'app',
        appId: '123456',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
        installationId: '789012',
      };
      githubProvider = new GithubProvider(authConfig, mockLogger);
    });

    describe('listAvailableRepositories', () => {
      it('uses GitHub App token for authentication', async () => {
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
          ],
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await githubProvider.listAvailableRepositories();

        expect(mockedCreateAppAuth).toHaveBeenCalledWith({
          appId: '123456',
          privateKey: '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
          installationId: '789012',
        });

        expect(mockAuth).toHaveBeenCalledWith({ type: 'installation' });

        expect(result).toEqual([
          {
            name: 'test-repo',
            owner: 'test-owner',
            description: 'Test repository',
            private: false,
            defaultBranch: 'main',
            language: 'TypeScript',
            stars: 42,
          },
        ]);
      });
    });

    describe('checkBranchExists', () => {
      const owner = 'test-owner';
      const repo = 'test-repo';
      const branch = 'main';

      it('uses GitHub App token for authentication', async () => {
        const mockResponse = {
          data: {
            name: 'main',
            commit: { sha: 'abc123' },
            protected: false,
          },
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await githubProvider.checkBranchExists(owner, repo, branch);

        expect(mockedCreateAppAuth).toHaveBeenCalledWith({
          appId: '123456',
          privateKey: '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
          installationId: '789012',
        });

        expect(mockAuth).toHaveBeenCalledWith({ type: 'installation' });

        expect(result).toBe(true);
      });
    });
  });
});
