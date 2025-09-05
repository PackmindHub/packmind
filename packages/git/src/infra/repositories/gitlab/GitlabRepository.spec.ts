import { GitlabRepository } from './GitlabRepository';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { GitlabRepositoryOptions } from './types';
import axios, { AxiosInstance } from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
} as unknown as jest.Mocked<AxiosInstance>;

describe('GitlabRepository', () => {
  let gitlabRepository: GitlabRepository;
  let mockLogger: jest.Mocked<PackmindLogger>;
  const repositoryOptions: GitlabRepositoryOptions = {
    owner: 'testowner',
    repo: 'testrepo',
    branch: 'main',
  };

  beforeEach(() => {
    mockLogger = stubLogger();
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    gitlabRepository = new GitlabRepository(
      'test-token',
      repositoryOptions,
      mockLogger,
    );
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
        new GitlabRepository(
          'test-token',
          repositoryOptions,
          mockLogger,
          'https://custom-gitlab.com/api/v4',
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
        new GitlabRepository(
          'test-token',
          repositoryOptions,
          mockLogger,
          'https://gitlab.company.com',
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
  });

  describe('commitFiles', () => {
    it('commits multiple files successfully', async () => {
      const files = [
        { path: 'file1.txt', content: 'content1' },
        { path: 'file2.txt', content: 'content2' },
      ];
      const commitMessage = 'Test commit';

      // Mock getFileOnRepo to return null (files don't exist)
      mockAxiosInstance.get.mockResolvedValue({
        status: 404,
      });

      // Mock successful commit
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          id: 'commit-sha-123',
          author_email: 'test@example.com',
          web_url:
            'https://gitlab.com/testowner/testrepo/-/commit/commit-sha-123',
        },
      });

      const result = await gitlabRepository.commitFiles(files, commitMessage);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/projects/testowner%2Ftestrepo/repository/commits',
        {
          branch: 'main',
          commit_message: commitMessage,
          actions: [
            { action: 'create', file_path: 'file1.txt', content: 'content1' }, // New files use 'create'
            { action: 'create', file_path: 'file2.txt', content: 'content2' }, // New files use 'create'
          ],
        },
        // No params needed since we use PRIVATE-TOKEN header
      );

      expect(result).toEqual({
        sha: 'commit-sha-123',
        message: commitMessage,
        author: 'test@example.com',
        url: 'https://gitlab.com/testowner/testrepo/-/commit/commit-sha-123',
      });
    });

    it('uses update action for existing files', async () => {
      const files = [{ path: 'existing-file.txt', content: 'new-content' }];
      const commitMessage = 'Update existing file';

      // Mock getFileOnRepo to return existing file
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          blob_id: 'existing-blob-id',
          content: Buffer.from('old-content').toString('base64'),
        },
      });

      // Mock successful commit
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          id: 'commit-sha-456',
          author_email: 'test@example.com',
          web_url:
            'https://gitlab.com/testowner/testrepo/-/commit/commit-sha-456',
        },
      });

      const result = await gitlabRepository.commitFiles(files, commitMessage);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/projects/testowner%2Ftestrepo/repository/commits',
        {
          branch: 'main',
          commit_message: commitMessage,
          actions: [
            {
              action: 'update',
              file_path: 'existing-file.txt',
              content: 'new-content',
            }, // Existing files use 'update'
          ],
        },
        // No params needed since we use PRIVATE-TOKEN header
      );

      expect(result).toEqual({
        sha: 'commit-sha-456',
        message: commitMessage,
        author: 'test@example.com',
        url: 'https://gitlab.com/testowner/testrepo/-/commit/commit-sha-456',
      });
    });

    describe('when no files have changed', () => {
      it('returns no-changes', async () => {
        const files = [{ path: 'file1.txt', content: 'existing-content' }];
        const commitMessage = 'Test commit';

        // Mock getFileOnRepo to return existing content
        mockAxiosInstance.get.mockResolvedValue({
          data: {
            blob_id: 'existing-blob-id',
            content: Buffer.from('existing-content').toString('base64'),
          },
        });

        const result = await gitlabRepository.commitFiles(files, commitMessage);

        expect(result).toEqual({
          sha: 'no-changes',
          message: '',
          author: '',
          url: '',
        });
      });
    });

    describe('when no files provided', () => {
      it('throws error', async () => {
        await expect(
          gitlabRepository.commitFiles([], 'Test commit'),
        ).rejects.toThrow('No files to commit');
      });
    });

    describe('when commit fails', () => {
      it('throws error', async () => {
        const files = [{ path: 'file1.txt', content: 'content1' }];

        mockAxiosInstance.get.mockResolvedValue({ status: 404 });
        mockAxiosInstance.post.mockRejectedValue(new Error('Commit failed'));

        await expect(
          gitlabRepository.commitFiles(files, 'Test commit'),
        ).rejects.toThrow('Failed to commit files to GitLab: Commit failed');
      });
    });

    it('throws specific error for insufficient permissions (403)', async () => {
      const files = [{ path: 'file1.txt', content: 'content1' }];

      mockAxiosInstance.get.mockResolvedValue({ status: 404 });
      const permissionError = {
        response: { status: 403 },
        message: 'Forbidden',
      };
      mockAxiosInstance.post.mockRejectedValue(permissionError);

      await expect(
        gitlabRepository.commitFiles(files, 'Test commit'),
      ).rejects.toThrow(
        'Insufficient permissions to commit to GitLab repository. Please ensure your token has write access to testowner/testrepo',
      );
    });
  });

  describe('getFileOnRepo', () => {
    describe('when file exists', () => {
      it('returns file content', async () => {
        const mockFileData = {
          blob_id: 'blob-id-123',
          content: Buffer.from('file content').toString('base64'),
        };

        mockAxiosInstance.get.mockResolvedValue({
          data: mockFileData,
        });

        const result = await gitlabRepository.getFileOnRepo(
          'test-file.txt',
          'main',
        );

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          '/projects/testowner%2Ftestrepo/repository/files/test-file.txt',
          {
            params: {
              ref: 'main',
            },
          },
        );

        expect(result).toEqual({
          sha: 'blob-id-123',
          content: Buffer.from('file content').toString('base64'),
        });
      });
    });

    describe('when file does not exist (404)', () => {
      it('returns null', async () => {
        const error = { response: { status: 404 } };
        mockAxiosInstance.get.mockRejectedValue(error);

        const result = await gitlabRepository.getFileOnRepo('nonexistent.txt');

        expect(result).toBeNull();
      });
    });

    it('throws error for other API failures', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Server error'));

      await expect(
        gitlabRepository.getFileOnRepo('test-file.txt'),
      ).rejects.toThrow('Server error');
    });
  });

  describe('handlePushHook', () => {
    it('processes GitLab webhook payload successfully', async () => {
      const mockPayload = {
        object_kind: 'push',
        event_name: 'push',
        before: '95790bf891e76fee5e1747ab589903a6a1f80f22',
        after: 'da1560886d4f094c3e6c9ef40349f7d38b5d27d7',
        ref: 'refs/heads/main',
        ref_protected: true,
        checkout_sha: 'da1560886d4f094c3e6c9ef40349f7d38b5d27d7',
        user_id: 4,
        user_name: 'John Smith',
        user_username: 'jsmith',
        user_email: 'john@example.com',
        user_avatar: 'https://s.gravatar.com/avatar/test',
        project_id: 15,
        project: {
          id: 15,
          name: 'testrepo',
          description: '',
          web_url: 'https://gitlab.com/testowner/testrepo',
          avatar_url: null,
          git_ssh_url: 'git@gitlab.com:testowner/testrepo.git',
          git_http_url: 'https://gitlab.com/testowner/testrepo.git',
          namespace: 'testowner',
          visibility_level: 20,
          path_with_namespace: 'testowner/testrepo',
          default_branch: 'main',
          ci_config_path: null,
          homepage: 'https://gitlab.com/testowner/testrepo',
          url: 'git@gitlab.com:testowner/testrepo.git',
          ssh_url: 'git@gitlab.com:testowner/testrepo.git',
          http_url: 'https://gitlab.com/testowner/testrepo.git',
        },
        commits: [
          {
            id: 'commit-123',
            message: 'Test commit',
            title: 'Test commit',
            timestamp: '2023-01-01T12:00:00Z',
            url: 'https://gitlab.com/testowner/testrepo/-/commit/commit-123',
            author: {
              name: 'Test Author',
              email: 'test@example.com',
            },
            added: [],
            modified: ['.packmind/recipes/test-recipe.md'],
            removed: [],
          },
        ],
        total_commits_count: 1,
      };

      // Mock file content retrieval
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          content: Buffer.from('# Test Recipe\nContent').toString('base64'),
          encoding: 'base64',
        },
      });

      const result = await gitlabRepository.handlePushHook(
        mockPayload,
        /.packmind\/recipes\/.*\.md/,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        filepath: '.packmind/recipes/test-recipe.md',
        fileContent: '# Test Recipe\nContent',
        author: 'Test Author',
        gitSha: 'commit-123',
        gitRepo: 'https://gitlab.com/testowner/testrepo',
        message: 'Test commit',
      });
    });

    it('returns empty array for non-push events', async () => {
      const mockPayload = {
        object_kind: 'merge_request',
        event_name: 'merge_request',
        ref: 'refs/heads/main',
      };

      const result = await gitlabRepository.handlePushHook(
        mockPayload,
        /.packmind\/recipes\/.*\.md/,
      );

      expect(result).toEqual([]);
    });

    describe('when no commits provided', () => {
      it('returns empty array', async () => {
        const mockPayload = {
          object_kind: 'push',
          event_name: 'push',
          ref: 'refs/heads/main',
          commits: [],
          total_commits_count: 0,
        };

        const result = await gitlabRepository.handlePushHook(
          mockPayload,
          /.packmind\/recipes\/.*\.md/,
        );

        expect(result).toEqual([]);
      });
    });

    it('returns empty array for non-main branch', async () => {
      const mockPayload = {
        object_kind: 'push',
        event_name: 'push',
        ref: 'refs/heads/feature-branch',
        commits: [
          {
            id: 'commit-123',
            message: 'Test commit',
            title: 'Test commit',
            timestamp: '2023-01-01T12:00:00Z',
            url: 'https://gitlab.com/testowner/testrepo/-/commit/commit-123',
            author: {
              name: 'Test Author',
              email: 'test@example.com',
            },
            added: [],
            modified: ['.packmind/recipes/test-recipe.md'],
            removed: [],
          },
        ],
        total_commits_count: 1,
      };

      const result = await gitlabRepository.handlePushHook(
        mockPayload,
        /.packmind\/recipes\/.*\.md/,
      );

      expect(result).toEqual([]);
    });

    describe('when no matching files found', () => {
      it('returns empty array', async () => {
        const mockPayload = {
          object_kind: 'push',
          event_name: 'push',
          ref: 'refs/heads/main',
          commits: [
            {
              id: 'commit-123',
              message: 'Test commit',
              title: 'Test commit',
              timestamp: '2023-01-01T12:00:00Z',
              url: 'https://gitlab.com/testowner/testrepo/-/commit/commit-123',
              author: {
                name: 'Test Author',
                email: 'test@example.com',
              },
              added: [],
              modified: ['README.md', 'src/index.js'],
              removed: [],
            },
          ],
          total_commits_count: 1,
        };

        const result = await gitlabRepository.handlePushHook(
          mockPayload,
          /.packmind\/recipes\/.*\.md/,
        );

        expect(result).toEqual([]);
      });
    });

    describe('when webhook processing fails', () => {
      it('throws error', async () => {
        const mockPayload = {
          object_kind: 'push',
          event_name: 'push',
          ref: 'refs/heads/main',
          commits: [
            {
              id: 'commit-123',
              message: 'Test commit',
              title: 'Test commit',
              timestamp: '2023-01-01T12:00:00Z',
              url: 'https://gitlab.com/testowner/testrepo/-/commit/commit-123',
              author: {
                name: 'Test Author',
                email: 'test@example.com',
              },
              added: [],
              modified: ['.packmind/recipes/test-recipe.md'],
              removed: [],
            },
          ],
          total_commits_count: 1,
        };

        mockAxiosInstance.get.mockRejectedValue(new Error('API error'));

        await expect(
          gitlabRepository.handlePushHook(
            mockPayload,
            /.packmind\/recipes\/.*\.md/,
          ),
        ).rejects.toThrow('Failed to process GitLab webhook: API error');
      });
    });
  });

  describe('isValidBranch', () => {
    it('returns true for main branch', () => {
      expect(gitlabRepository.isValidBranch('refs/heads/main')).toBe(true);
    });

    it('returns false for other branches', () => {
      expect(gitlabRepository.isValidBranch('refs/heads/develop')).toBe(false);
      expect(gitlabRepository.isValidBranch('refs/heads/feature-branch')).toBe(
        false,
      );
    });
  });

  describe('isPushEventFromWebhook', () => {
    it('returns true for GitLab push events', () => {
      const headers = { 'x-gitlab-event': 'Push Hook' };
      expect(gitlabRepository.isPushEventFromWebhook(headers)).toBe(true);
    });

    it('returns false for other GitLab events', () => {
      const headers = { 'x-gitlab-event': 'Merge Request Hook' };
      expect(gitlabRepository.isPushEventFromWebhook(headers)).toBe(false);
    });

    describe('when no GitLab event header present', () => {
      it('returns false', () => {
        const headers = { 'x-github-event': 'push' };
        expect(gitlabRepository.isPushEventFromWebhook(headers)).toBe(false);
      });
    });
  });
});
