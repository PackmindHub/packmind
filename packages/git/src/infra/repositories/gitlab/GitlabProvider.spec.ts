import { GitlabProvider } from './GitlabProvider';
import { PackmindLogger } from '@packmind/logger';
import { AxiosInstance } from 'axios';
import { stubLogger } from '@packmind/test-utils';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
} as unknown as jest.Mocked<AxiosInstance>;

describe('GitlabProvider', () => {
  let gitlabProvider: GitlabProvider;
  let mockLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockLogger = stubLogger();
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    (mockedAxios.isAxiosError as unknown as jest.Mock).mockImplementation(
      (payload) =>
        typeof payload === 'object' &&
        payload !== null &&
        (payload as { isAxiosError?: boolean }).isAxiosError === true,
    );
    gitlabProvider = new GitlabProvider('test-token', '', mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('creates axios client with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://gitlab.com/api/v4',
        headers: {
          'Content-Type': 'application/json',
          'PRIVATE-TOKEN': 'test-token',
        },
      });
    });

    describe('when provided with custom base URL with /api/v4', () => {
      it('uses the provided URL as-is', () => {
        mockedAxios.create.mockClear();
        new GitlabProvider(
          'test-token',
          'https://custom-gitlab.com/api/v4',
          mockLogger,
        );

        expect(mockedAxios.create).toHaveBeenCalledWith({
          baseURL: 'https://custom-gitlab.com/api/v4',
          headers: {
            'Content-Type': 'application/json',
            'PRIVATE-TOKEN': 'test-token',
          },
        });
      });
    });

    describe('when base URL provided without /api/v4', () => {
      it('appends /api/v4 to the URL', () => {
        mockedAxios.create.mockClear();
        new GitlabProvider(
          'test-token',
          'https://gitlab.company.com',
          mockLogger,
        );

        expect(mockedAxios.create).toHaveBeenCalledWith({
          baseURL: 'https://gitlab.company.com/api/v4',
          headers: {
            'Content-Type': 'application/json',
            'PRIVATE-TOKEN': 'test-token',
          },
        });
      });
    });

    it('handles trailing slash correctly', () => {
      mockedAxios.create.mockClear();
      new GitlabProvider(
        'test-token',
        'https://gitlab.company.com/',
        mockLogger,
      );

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://gitlab.company.com/api/v4',
        headers: {
          'Content-Type': 'application/json',
          'PRIVATE-TOKEN': 'test-token',
        },
      });
    });
  });

  describe('listAvailableRepositories', () => {
    describe('when fetching repositories', () => {
      const mockGitLabProjects = [
        {
          id: 1,
          name: 'test-repo',
          description: 'Test repository',
          default_branch: 'main',
          visibility: 'private',
          star_count: 5,
          path_with_namespace: 'testuser/test-repo',
          namespace: {
            name: 'Test User',
            path: 'testuser',
            full_path: 'testuser',
          },
          permissions: {
            project_access: {
              access_level: 40, // MAINTAINER
            },
          },
        },
        {
          id: 2,
          name: 'public-repo',
          description: null,
          default_branch: 'master',
          visibility: 'public',
          star_count: 0,
          path_with_namespace: 'testorg/subgroup/public-repo',
          namespace: {
            name: 'Test Org Subgroup',
            path: 'subgroup',
            full_path: 'testorg/subgroup',
          },
          permissions: {
            group_access: {
              access_level: 30, // DEVELOPER
            },
          },
        },
      ];

      let result: Awaited<
        ReturnType<typeof gitlabProvider.listAvailableRepositories>
      >;

      beforeEach(async () => {
        mockAxiosInstance.get.mockResolvedValue({
          data: mockGitLabProjects,
        });

        result = await gitlabProvider.listAvailableRepositories();
      });

      it('calls API with correct parameters', () => {
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/projects', {
          params: {
            membership: true,
            archived: false,
            order_by: 'last_activity_at',
            per_page: 100,
            page: 1,
          },
        });
      });

      it('returns mapped repositories with correct format', () => {
        expect(result.repositories).toEqual([
          {
            name: 'test-repo',
            owner: 'testuser', // Single level namespace
            description: 'Test repository',
            private: true,
            defaultBranch: 'main',
            language: undefined,
            stars: 5,
          },
          {
            name: 'public-repo',
            owner: 'testorg/subgroup', // Multi-level namespace
            description: undefined,
            private: false,
            defaultBranch: 'master',
            language: undefined,
            stars: 0,
          },
        ]);
      });

      it('reports the requested page as the last loaded page', () => {
        expect(result.lastLoadedPage).toBe(1);
      });
    });

    describe('when projects have insufficient access level', () => {
      const mockGitLabProjects = [
        {
          id: 1,
          name: 'maintainer-repo',
          path_with_namespace: 'user/maintainer-repo',
          namespace: {
            path: 'user',
            name: 'User',
            full_path: 'user',
          },
          permissions: { project_access: { access_level: 40 } }, // MAINTAINER - sufficient
          default_branch: 'main',
          visibility: 'private',
          star_count: 0,
        },
        {
          id: 2,
          name: 'reporter-repo',
          path_with_namespace: 'user/reporter-repo',
          namespace: {
            path: 'user',
            name: 'User',
            full_path: 'user',
          },
          permissions: { project_access: { access_level: 20 } }, // REPORTER - insufficient for write
          default_branch: 'main',
          visibility: 'private',
          star_count: 0,
        },
      ];

      let result: Awaited<
        ReturnType<typeof gitlabProvider.listAvailableRepositories>
      >;

      beforeEach(async () => {
        mockAxiosInstance.get.mockResolvedValue({
          data: mockGitLabProjects,
        });

        result = await gitlabProvider.listAvailableRepositories();
      });

      it('filters out projects without write access', () => {
        expect(result.repositories).toHaveLength(1);
      });

      it('includes only maintainer-level repositories', () => {
        expect(result.repositories[0].name).toBe('maintainer-repo');
      });
    });

    describe('when handling nested namespace paths', () => {
      const mockGitLabProjects = [
        {
          id: 1,
          name: 'protomind',
          description: 'Nested project',
          default_branch: 'main',
          visibility: 'private',
          star_count: 3,
          path_with_namespace: 'promyze/sandbox/protomind',
          namespace: {
            name: 'Sandbox',
            path: 'sandbox',
            full_path: 'promyze/sandbox',
          },
          permissions: {
            project_access: {
              access_level: 40, // MAINTAINER
            },
          },
        },
      ];

      let result: Awaited<
        ReturnType<typeof gitlabProvider.listAvailableRepositories>
      >;

      beforeEach(async () => {
        mockAxiosInstance.get.mockResolvedValue({
          data: mockGitLabProjects,
        });

        result = await gitlabProvider.listAvailableRepositories();
      });

      it('returns one repository', () => {
        expect(result.repositories).toHaveLength(1);
      });

      it('correctly maps nested namespace path', () => {
        expect(result.repositories[0]).toEqual({
          name: 'protomind', // Uses the path-friendly name from path_with_namespace
          owner: 'promyze/sandbox', // Should extract the full namespace path
          description: 'Nested project',
          private: true,
          defaultBranch: 'main',
          language: undefined,
          stars: 3,
        });
      });
    });

    describe('when no data received', () => {
      it('returns empty array', async () => {
        mockAxiosInstance.get.mockResolvedValue({ data: null });

        const result = await gitlabProvider.listAvailableRepositories();

        expect(result.repositories).toEqual([]);
      });
    });

    describe('when access filtering leaves pages under-filled', () => {
      const writableProject = (id: number, name: string) => ({
        id,
        name,
        description: null,
        default_branch: 'main',
        visibility: 'private',
        star_count: 0,
        path_with_namespace: `user/${name}`,
        namespace: { name: 'User', path: 'user', full_path: 'user' },
        permissions: { project_access: { access_level: 40 } }, // MAINTAINER
      });

      beforeEach(() => {
        // Each provider page contributes a single accessible project, so the
        // loop must pull all three pages before it runs out of pages.
        mockAxiosInstance.get
          .mockResolvedValueOnce({
            data: [writableProject(1, 'project-1')],
            headers: { 'x-total-pages': '3' },
          })
          .mockResolvedValueOnce({
            data: [writableProject(2, 'project-2')],
            headers: { 'x-total-pages': '3' },
          })
          .mockResolvedValueOnce({
            data: [writableProject(3, 'project-3')],
            headers: { 'x-total-pages': '3' },
          });
      });

      it('accumulates accessible projects across provider pages', async () => {
        const result = await gitlabProvider.listAvailableRepositories(1);

        expect(result.repositories.map((repo) => repo.name)).toEqual([
          'project-1',
          'project-2',
          'project-3',
        ]);
      });

      it('reports the last provider page it consumed', async () => {
        const result = await gitlabProvider.listAvailableRepositories(1);

        expect(result.lastLoadedPage).toBe(3);
      });

      it('requests each provider page in order', async () => {
        await gitlabProvider.listAvailableRepositories(1);

        expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(3, '/projects', {
          params: {
            membership: true,
            archived: false,
            order_by: 'last_activity_at',
            per_page: 100,
            page: 3,
          },
        });
      });
    });

    describe('when API call fails', () => {
      it('throws error', async () => {
        mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

        await expect(
          gitlabProvider.listAvailableRepositories(),
        ).rejects.toThrow('Failed to fetch repositories from GitLab');
      });
    });

    describe('pagination', () => {
      it('requests the given page', async () => {
        mockAxiosInstance.get.mockResolvedValue({ data: [], headers: {} });

        await gitlabProvider.listAvailableRepositories(4);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/projects', {
          params: {
            membership: true,
            archived: false,
            order_by: 'last_activity_at',
            per_page: 100,
            page: 4,
          },
        });
      });

      describe('when the x-total-pages header is present', () => {
        it('reports it as the total page count', async () => {
          mockAxiosInstance.get.mockResolvedValue({
            data: [],
            headers: { 'x-total-pages': '7' },
          });

          const result = await gitlabProvider.listAvailableRepositories(1);

          expect(result.totalPages).toBe(7);
        });
      });

      describe('when the x-total-pages header is missing', () => {
        it('falls back to the current page', async () => {
          mockAxiosInstance.get.mockResolvedValue({ data: [], headers: {} });

          const result = await gitlabProvider.listAvailableRepositories(2);

          expect(result.totalPages).toBe(2);
        });
      });
    });
  });

  describe('checkBranchExists', () => {
    describe('when branch exists', () => {
      let result: boolean;

      beforeEach(async () => {
        mockAxiosInstance.get.mockResolvedValue({
          data: { name: 'main' },
        });

        result = await gitlabProvider.checkBranchExists(
          'owner',
          'repo',
          'main',
        );
      });

      it('returns true', () => {
        expect(result).toBe(true);
      });

      it('calls API with encoded project path', () => {
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          '/projects/owner%2Frepo/repository/branches/main',
        );
      });
    });

    describe('when branch does not exist (404)', () => {
      it('returns false', async () => {
        const error = new Error('Not found');
        error.message = '404';
        mockAxiosInstance.get.mockRejectedValue(error);

        const result = await gitlabProvider.checkBranchExists(
          'owner',
          'repo',
          'nonexistent',
        );

        expect(result).toBe(false);
      });
    });

    it('throws error for authentication failure (401)', async () => {
      const error = new Error('Unauthorized');
      error.message = '401';
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(
        gitlabProvider.checkBranchExists('owner', 'repo', 'main'),
      ).rejects.toThrow(
        'GitLab API authentication failed. Please check your token.',
      );
    });

    it('throws error for rate limit (403)', async () => {
      const error = new Error('Forbidden');
      error.message = '403';
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(
        gitlabProvider.checkBranchExists('owner', 'repo', 'main'),
      ).rejects.toThrow(
        'GitLab API rate limit exceeded or access forbidden. Please try again later.',
      );
    });

    it('throws error for other API failures', async () => {
      const error = new Error('Internal server error');
      error.message = '500';
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(
        gitlabProvider.checkBranchExists('owner', 'repo', 'main'),
      ).rejects.toThrow(
        'Failed to check if branch exists for owner/repo/main: 500',
      );
    });
  });

  describe('checkAuth', () => {
    const buildAxiosError = (status: number) => {
      const err = new Error(
        `Request failed with status code ${status}`,
      ) as Error & {
        isAxiosError: true;
        response: { status: number; headers: Record<string, string> };
      };
      err.isAxiosError = true;
      err.response = { status, headers: {} };
      return err;
    };

    it('probes /user', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { id: 1 } });

      await gitlabProvider.checkAuth();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/user');
    });

    it('returns ok on 200', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { id: 1 } });

      const result = await gitlabProvider.checkAuth();

      expect(result).toEqual({ ok: true });
    });

    it('maps 401 to unauthorized', async () => {
      mockAxiosInstance.get.mockRejectedValue(buildAxiosError(401));

      const result = await gitlabProvider.checkAuth();

      expect(result).toEqual({ ok: false, reason: 'unauthorized' });
    });

    it('maps 403 to forbidden', async () => {
      mockAxiosInstance.get.mockRejectedValue(buildAxiosError(403));

      const result = await gitlabProvider.checkAuth();

      expect(result).toEqual({ ok: false, reason: 'forbidden' });
    });

    it('maps 429 to rate_limited', async () => {
      mockAxiosInstance.get.mockRejectedValue(buildAxiosError(429));

      const result = await gitlabProvider.checkAuth();

      expect(result).toEqual({ ok: false, reason: 'rate_limited' });
    });

    it('maps non-axios errors to network', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('boom'));

      const result = await gitlabProvider.checkAuth();

      expect(result).toEqual({ ok: false, reason: 'network' });
    });
  });
});
