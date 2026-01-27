import { GitlabRepository } from './GitlabRepository';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
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
      'https://gitlab.com',
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
        new GitlabRepository(
          'test-token',
          repositoryOptions,
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
  });

  describe('commitFiles', () => {
    describe('when committing multiple new files', () => {
      const files = [
        { path: 'file1.txt', content: 'content1' },
        { path: 'file2.txt', content: 'content2' },
      ];
      const commitMessage = 'Test commit';
      let result: Awaited<ReturnType<typeof gitlabRepository.commitFiles>>;

      beforeEach(async () => {
        // Mock tree API to return empty (files don't exist)
        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (url.includes('/repository/tree')) {
            return Promise.resolve({ data: [], headers: {} });
          }
          return Promise.reject({ response: { status: 404 } });
        });

        mockAxiosInstance.post.mockResolvedValue({
          data: {
            id: 'commit-sha-123',
            author_email: 'test@example.com',
            web_url:
              'https://gitlab.com/testowner/testrepo/-/commit/commit-sha-123',
          },
        });

        result = await gitlabRepository.commitFiles(files, commitMessage);
      });

      it('fetches tree API first', () => {
        const treeCalls = mockAxiosInstance.get.mock.calls.filter(
          (call) =>
            typeof call[0] === 'string' && call[0].includes('/repository/tree'),
        );
        expect(treeCalls.length).toBeGreaterThanOrEqual(1);
      });

      it('calls API with create actions for new files', () => {
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/projects/testowner%2Ftestrepo/repository/commits',
          {
            branch: 'main',
            commit_message: commitMessage,
            actions: [
              { action: 'create', file_path: 'file1.txt', content: 'content1' },
              { action: 'create', file_path: 'file2.txt', content: 'content2' },
            ],
          },
        );
      });

      it('returns commit details', () => {
        expect(result).toEqual({
          sha: 'commit-sha-123',
          message: commitMessage,
          author: 'test@example.com',
          url: 'https://gitlab.com/testowner/testrepo/-/commit/commit-sha-123',
        });
      });
    });

    describe('when committing existing files', () => {
      const files = [{ path: 'existing-file.txt', content: 'new-content' }];
      const commitMessage = 'Update existing file';
      let result: Awaited<ReturnType<typeof gitlabRepository.commitFiles>>;

      beforeEach(async () => {
        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (url.includes('/repository/tree')) {
            // Tree shows file exists
            return Promise.resolve({
              data: [{ path: 'existing-file.txt', type: 'blob' }],
              headers: {},
            });
          }
          if (url.includes('/repository/files/')) {
            // getFileOnRepo returns content for diff check
            return Promise.resolve({
              data: {
                blob_id: 'existing-blob-id',
                content: Buffer.from('old-content').toString('base64'),
              },
            });
          }
          return Promise.reject({ response: { status: 404 } });
        });

        mockAxiosInstance.post.mockResolvedValue({
          data: {
            id: 'commit-sha-456',
            author_email: 'test@example.com',
            web_url:
              'https://gitlab.com/testowner/testrepo/-/commit/commit-sha-456',
          },
        });

        result = await gitlabRepository.commitFiles(files, commitMessage);
      });

      it('fetches tree API first', () => {
        const treeCalls = mockAxiosInstance.get.mock.calls.filter(
          (call) =>
            typeof call[0] === 'string' && call[0].includes('/repository/tree'),
        );
        expect(treeCalls.length).toBeGreaterThanOrEqual(1);
      });

      it('calls getFileOnRepo to check content changes', () => {
        const fileCalls = mockAxiosInstance.get.mock.calls.filter(
          (call) =>
            typeof call[0] === 'string' &&
            call[0].includes('/repository/files/'),
        );
        expect(fileCalls).toHaveLength(1);
      });

      it('calls API with update action for existing files', () => {
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
              },
            ],
          },
        );
      });

      it('returns commit details', () => {
        expect(result).toEqual({
          sha: 'commit-sha-456',
          message: commitMessage,
          author: 'test@example.com',
          url: 'https://gitlab.com/testowner/testrepo/-/commit/commit-sha-456',
        });
      });
    });

    describe('when no files have changed', () => {
      it('returns no-changes', async () => {
        const files = [{ path: 'file1.txt', content: 'existing-content' }];
        const commitMessage = 'Test commit';

        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (url.includes('/repository/tree')) {
            return Promise.resolve({
              data: [{ path: 'file1.txt', type: 'blob' }],
              headers: {},
            });
          }
          if (url.includes('/repository/files/')) {
            return Promise.resolve({
              data: {
                blob_id: 'existing-blob-id',
                content: Buffer.from('existing-content').toString('base64'),
              },
            });
          }
          return Promise.reject({ response: { status: 404 } });
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

        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (url.includes('/repository/tree')) {
            return Promise.resolve({ data: [], headers: {} });
          }
          return Promise.reject({ response: { status: 404 } });
        });
        mockAxiosInstance.post.mockRejectedValue(new Error('Commit failed'));

        await expect(
          gitlabRepository.commitFiles(files, 'Test commit'),
        ).rejects.toThrow('Failed to commit files to GitLab: Commit failed');
      });
    });

    it('throws specific error for insufficient permissions (403)', async () => {
      const files = [{ path: 'file1.txt', content: 'content1' }];

      mockAxiosInstance.get.mockImplementation((url: string) => {
        if (url.includes('/repository/tree')) {
          return Promise.resolve({ data: [], headers: {} });
        }
        return Promise.reject({ response: { status: 404 } });
      });
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

    describe('when path normalization handles leading/trailing slashes', () => {
      it('treats paths with leading slashes as equivalent', async () => {
        const files = [{ path: '/path/to/file.txt', content: 'content' }];

        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (url.includes('/repository/tree')) {
            // Tree returns path without leading slash
            return Promise.resolve({
              data: [{ path: 'path/to/file.txt', type: 'blob' }],
              headers: {},
            });
          }
          if (url.includes('/repository/files/')) {
            return Promise.resolve({
              data: {
                blob_id: 'existing-blob-id',
                content: Buffer.from('old-content').toString('base64'),
              },
            });
          }
          return Promise.reject({ response: { status: 404 } });
        });

        mockAxiosInstance.post.mockResolvedValue({
          data: {
            id: 'commit-sha-normalized',
            author_email: 'test@example.com',
            web_url:
              'https://gitlab.com/testowner/testrepo/-/commit/commit-sha-normalized',
          },
        });

        await gitlabRepository.commitFiles(files, 'Test commit');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/projects/testowner%2Ftestrepo/repository/commits',
          expect.objectContaining({
            actions: [
              expect.objectContaining({
                action: 'update',
                file_path: '/path/to/file.txt',
              }),
            ],
          }),
        );
      });
    });

    describe('when deleting files', () => {
      const files = [{ path: 'file1.txt', content: 'content1' }];
      const deleteFiles = [
        { path: 'file-to-delete.txt' },
        { path: 'another-file-to-delete.txt' },
      ];

      beforeEach(() => {
        // Mock getFileOnRepo to return null (files don't exist for creation)
        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (url.includes('/repository/tree')) {
            // Return tree with existing files
            return Promise.resolve({
              data: [
                { path: 'file-to-delete.txt', type: 'blob' },
                { path: 'another-file-to-delete.txt', type: 'blob' },
              ],
              headers: {},
            });
          }
          // For file content check, return 404 (files don't exist)
          return Promise.reject({ response: { status: 404 } });
        });

        // Mock successful commit
        mockAxiosInstance.post.mockResolvedValue({
          data: {
            id: 'commit-sha-789',
            author_email: 'test@example.com',
            web_url:
              'https://gitlab.com/testowner/testrepo/-/commit/commit-sha-789',
          },
        });
      });

      it('creates commit with delete actions for existing files', async () => {
        await gitlabRepository.commitFiles(files, 'Delete files', deleteFiles);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/projects/testowner%2Ftestrepo/repository/commits',
          {
            branch: 'main',
            commit_message: 'Delete files',
            actions: [
              { action: 'create', file_path: 'file1.txt', content: 'content1' },
              { action: 'delete', file_path: 'file-to-delete.txt' },
              { action: 'delete', file_path: 'another-file-to-delete.txt' },
            ],
          },
        );
      });

      describe('when only deleting files without adding new ones', () => {
        it('creates commit with only delete actions', async () => {
          await gitlabRepository.commitFiles([], 'Delete only', deleteFiles);

          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
            '/projects/testowner%2Ftestrepo/repository/commits',
            {
              branch: 'main',
              commit_message: 'Delete only',
              actions: [
                { action: 'delete', file_path: 'file-to-delete.txt' },
                { action: 'delete', file_path: 'another-file-to-delete.txt' },
              ],
            },
          );
        });
      });
    });

    describe('when filtering non-existent files during deletion', () => {
      describe('when some files to delete do not exist in the repo', () => {
        const deleteFiles = [
          { path: 'existing-file.txt' },
          { path: 'non-existent-file.txt' },
        ];

        beforeEach(() => {
          mockAxiosInstance.get.mockImplementation((url: string) => {
            if (url.includes('/repository/tree')) {
              // Only return existing-file.txt in the tree
              return Promise.resolve({
                data: [{ path: 'existing-file.txt', type: 'blob' }],
                headers: {},
              });
            }
            return Promise.reject({ response: { status: 404 } });
          });

          mockAxiosInstance.post.mockResolvedValue({
            data: {
              id: 'commit-sha-filter',
              author_email: 'test@example.com',
              web_url:
                'https://gitlab.com/testowner/testrepo/-/commit/commit-sha-filter',
            },
          });
        });

        it('deletes only files that exist in the repository', async () => {
          const files = [{ path: 'new-file.txt', content: 'content' }];
          await gitlabRepository.commitFiles(files, 'Commit', deleteFiles);

          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
            '/projects/testowner%2Ftestrepo/repository/commits',
            {
              branch: 'main',
              commit_message: 'Commit',
              actions: [
                {
                  action: 'create',
                  file_path: 'new-file.txt',
                  content: 'content',
                },
                { action: 'delete', file_path: 'existing-file.txt' },
              ],
            },
          );
        });
      });

      describe('when all files to delete do not exist in the repo', () => {
        const nonExistentDeleteFiles = [
          { path: 'non-existent-1.txt' },
          { path: 'non-existent-2.txt' },
        ];

        beforeEach(() => {
          mockAxiosInstance.get.mockImplementation((url: string) => {
            if (url.includes('/repository/tree')) {
              // Return empty tree (no files exist)
              return Promise.resolve({ data: [], headers: {} });
            }
            return Promise.reject({ response: { status: 404 } });
          });
        });

        describe('with file modifications', () => {
          it('creates commit with only file modifications', async () => {
            const files = [{ path: 'new-file.txt', content: 'content' }];

            mockAxiosInstance.post.mockResolvedValue({
              data: {
                id: 'commit-sha-no-delete',
                author_email: 'test@example.com',
                web_url:
                  'https://gitlab.com/testowner/testrepo/-/commit/commit-sha-no-delete',
              },
            });

            await gitlabRepository.commitFiles(
              files,
              'Commit',
              nonExistentDeleteFiles,
            );

            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
              '/projects/testowner%2Ftestrepo/repository/commits',
              {
                branch: 'main',
                commit_message: 'Commit',
                actions: [
                  {
                    action: 'create',
                    file_path: 'new-file.txt',
                    content: 'content',
                  },
                ],
              },
            );
          });
        });

        describe('without file modifications', () => {
          describe('when no existing files to delete', () => {
            it('returns no-changes', async () => {
              const result = await gitlabRepository.commitFiles(
                [],
                'Delete files',
                nonExistentDeleteFiles,
              );

              expect(result).toEqual({
                sha: 'no-changes',
                message: '',
                author: '',
                url: '',
              });
            });

            it('does not create a commit', async () => {
              await gitlabRepository.commitFiles(
                [],
                'Delete files',
                nonExistentDeleteFiles,
              );

              expect(mockAxiosInstance.post).not.toHaveBeenCalled();
            });
          });
        });
      });
    });

    describe('when repository tree has multiple pages', () => {
      describe('when files to delete exist on second page', () => {
        const deleteFiles = [
          { path: 'file-on-page-1.txt' },
          { path: 'file-on-page-2.txt' },
        ];

        beforeEach(() => {
          let callCount = 0;
          mockAxiosInstance.get.mockImplementation((url: string) => {
            if (url.includes('/repository/tree')) {
              callCount++;
              if (callCount === 1) {
                // First page - return file-on-page-1.txt
                return Promise.resolve({
                  data: [{ path: 'file-on-page-1.txt', type: 'blob' }],
                  headers: { 'x-next-page': '2' },
                });
              }
              // Second page - return file-on-page-2.txt
              return Promise.resolve({
                data: [{ path: 'file-on-page-2.txt', type: 'blob' }],
                headers: {},
              });
            }
            return Promise.reject({ response: { status: 404 } });
          });

          mockAxiosInstance.post.mockResolvedValue({
            data: {
              id: 'commit-sha-paginated',
              author_email: 'test@example.com',
              web_url:
                'https://gitlab.com/testowner/testrepo/-/commit/commit-sha-paginated',
            },
          });
        });

        it('includes files from all pages in deletion', async () => {
          await gitlabRepository.commitFiles([], 'Delete files', deleteFiles);

          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
            '/projects/testowner%2Ftestrepo/repository/commits',
            {
              branch: 'main',
              commit_message: 'Delete files',
              actions: [
                { action: 'delete', file_path: 'file-on-page-1.txt' },
                { action: 'delete', file_path: 'file-on-page-2.txt' },
              ],
            },
          );
        });

        it('fetches multiple pages of tree', async () => {
          await gitlabRepository.commitFiles([], 'Delete files', deleteFiles);

          const treeCalls = mockAxiosInstance.get.mock.calls.filter(
            (call) =>
              typeof call[0] === 'string' &&
              call[0].includes('/repository/tree'),
          );
          expect(treeCalls).toHaveLength(2);
        });
      });

      describe('when using Link header for pagination', () => {
        const deleteFiles = [
          { path: 'file-page-1.txt' },
          { path: 'file-page-2.txt' },
        ];

        beforeEach(() => {
          let callCount = 0;
          mockAxiosInstance.get.mockImplementation((url: string) => {
            if (url.includes('/repository/tree')) {
              callCount++;
              if (callCount === 1) {
                return Promise.resolve({
                  data: [{ path: 'file-page-1.txt', type: 'blob' }],
                  headers: {
                    link: '<https://gitlab.com/api/v4/projects/testowner%2Ftestrepo/repository/tree?page=2>; rel="next"',
                  },
                });
              }
              return Promise.resolve({
                data: [{ path: 'file-page-2.txt', type: 'blob' }],
                headers: {},
              });
            }
            return Promise.reject({ response: { status: 404 } });
          });

          mockAxiosInstance.post.mockResolvedValue({
            data: {
              id: 'commit-sha-link',
              author_email: 'test@example.com',
              web_url:
                'https://gitlab.com/testowner/testrepo/-/commit/commit-sha-link',
            },
          });
        });

        it('follows Link header for pagination', async () => {
          await gitlabRepository.commitFiles([], 'Delete files', deleteFiles);

          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
            '/projects/testowner%2Ftestrepo/repository/commits',
            {
              branch: 'main',
              commit_message: 'Delete files',
              actions: [
                { action: 'delete', file_path: 'file-page-1.txt' },
                { action: 'delete', file_path: 'file-page-2.txt' },
              ],
            },
          );
        });
      });
    });

    describe('when files array contains duplicates', () => {
      it('deduplicates files keeping the last occurrence', async () => {
        const filesWithDuplicates = [
          { path: 'AGENTS.md', content: 'first content' },
          { path: 'file2.txt', content: 'content2' },
          { path: 'AGENTS.md', content: 'second content' }, // Duplicate - should keep this one
        ];

        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (url.includes('/repository/tree')) {
            return Promise.resolve({ data: [], headers: {} });
          }
          return Promise.reject({ response: { status: 404 } });
        });

        mockAxiosInstance.post.mockResolvedValue({
          data: {
            id: 'commit-sha-dedup',
            author_email: 'test@example.com',
            web_url:
              'https://gitlab.com/testowner/testrepo/-/commit/commit-sha-dedup',
          },
        });

        await gitlabRepository.commitFiles(
          filesWithDuplicates,
          'Commit with duplicates',
        );

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/projects/testowner%2Ftestrepo/repository/commits',
          {
            branch: 'main',
            commit_message: 'Commit with duplicates',
            actions: [
              {
                action: 'create',
                file_path: 'AGENTS.md',
                content: 'second content',
              },
              { action: 'create', file_path: 'file2.txt', content: 'content2' },
            ],
          },
        );
      });

      it('deduplicates delete files', async () => {
        const deleteFilesWithDuplicates = [
          { path: 'file1.txt' },
          { path: 'file2.txt' },
          { path: 'file1.txt' }, // Duplicate
        ];

        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (url.includes('/repository/tree')) {
            return Promise.resolve({
              data: [
                { path: 'file1.txt', type: 'blob' },
                { path: 'file2.txt', type: 'blob' },
              ],
              headers: {},
            });
          }
          return Promise.reject({ response: { status: 404 } });
        });

        mockAxiosInstance.post.mockResolvedValue({
          data: {
            id: 'commit-sha-dedup-delete',
            author_email: 'test@example.com',
            web_url:
              'https://gitlab.com/testowner/testrepo/-/commit/commit-sha-dedup-delete',
          },
        });

        await gitlabRepository.commitFiles(
          [],
          'Delete with duplicates',
          deleteFilesWithDuplicates,
        );

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/projects/testowner%2Ftestrepo/repository/commits',
          {
            branch: 'main',
            commit_message: 'Delete with duplicates',
            actions: [
              { action: 'delete', file_path: 'file1.txt' },
              { action: 'delete', file_path: 'file2.txt' },
            ],
          },
        );
      });
    });
  });

  describe('getFileOnRepo', () => {
    describe('when file exists', () => {
      const mockFileData = {
        blob_id: 'blob-id-123',
        content: Buffer.from('file content').toString('base64'),
      };
      let result: Awaited<ReturnType<typeof gitlabRepository.getFileOnRepo>>;

      beforeEach(async () => {
        mockAxiosInstance.get.mockResolvedValue({
          data: mockFileData,
        });

        result = await gitlabRepository.getFileOnRepo('test-file.txt', 'main');
      });

      it('calls API with correct parameters', () => {
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          '/projects/testowner%2Ftestrepo/repository/files/test-file.txt',
          {
            params: {
              ref: 'main',
            },
          },
        );
      });

      it('returns file content with sha', () => {
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
    describe('when processing valid push webhook payload', () => {
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
      let result: Awaited<ReturnType<typeof gitlabRepository.handlePushHook>>;

      beforeEach(async () => {
        mockAxiosInstance.get.mockResolvedValue({
          data: {
            content: Buffer.from('# Test Recipe\nContent').toString('base64'),
            encoding: 'base64',
          },
        });

        result = await gitlabRepository.handlePushHook(
          mockPayload,
          /.packmind\/recipes\/.*\.md/,
        );
      });

      it('returns one matching file', () => {
        expect(result).toHaveLength(1);
      });

      it('returns file details with correct content', () => {
        expect(result[0]).toEqual({
          filepath: '.packmind/recipes/test-recipe.md',
          fileContent: '# Test Recipe\nContent',
          author: 'Test Author',
          gitSha: 'commit-123',
          gitRepo: 'https://gitlab.com/testowner/testrepo',
          message: 'Test commit',
        });
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

    describe('when branch is not main', () => {
      it('returns false for develop branch', () => {
        expect(gitlabRepository.isValidBranch('refs/heads/develop')).toBe(
          false,
        );
      });

      it('returns false for feature branch', () => {
        expect(
          gitlabRepository.isValidBranch('refs/heads/feature-branch'),
        ).toBe(false);
      });
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
