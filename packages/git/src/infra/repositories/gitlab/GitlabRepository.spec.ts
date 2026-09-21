import { GitlabRepository } from './GitlabRepository';
import { PROVIDER_REQUEST_TIMEOUT_MS } from '../http/withTransientRetry';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { gitBlobSha } from '@packmind/node-utils';
import {
  PROVIDER_MAX_SOCKETS,
  providerHttpsAgent,
} from '../http/providerHttpAgent';
import { GitlabRepositoryOptions } from './types';
import axios, { AxiosInstance } from 'axios';
import {
  GitRemoteAccessForbiddenError,
  GitRemoteRepositoryNotFoundError,
  NoFilesToCommitError,
} from '@packmind/types';
import { GitlabRateLimitedError } from '../../../domain/errors';

jest.mock('axios');
const actualAxios = jest.requireActual<typeof axios>('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
// An AxiosInstance is callable and mostly data, so it is mocked by hand rather
// than with mockInterface: only the verbs this suite drives are stubbed.
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
} as Partial<jest.Mocked<AxiosInstance>> as jest.Mocked<AxiosInstance>;

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
    mockedAxios.isAxiosError.mockImplementation(actualAxios.isAxiosError);
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
        timeout: PROVIDER_REQUEST_TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          'PRIVATE-TOKEN': 'test-token',
        },
        httpsAgent: providerHttpsAgent,
      });
    });

    describe('the agent it is given', () => {
      // `keepAlive` alone would pass without any code change — Node has
      // defaulted it to true since v19. The finite ceiling is the part that
      // changes behaviour.
      it('caps how many sockets may be open at once', () => {
        expect(providerHttpsAgent.maxSockets).toBe(PROVIDER_MAX_SOCKETS);
      });

      it('caps them at a finite number', () => {
        expect(Number.isFinite(providerHttpsAgent.maxSockets)).toBe(true);
      });

      it('keeps sockets alive so the cap can be reused against', () => {
        expect(providerHttpsAgent.options.keepAlive).toBe(true);
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
          timeout: PROVIDER_REQUEST_TIMEOUT_MS,
          headers: {
            'Content-Type': 'application/json',
            'PRIVATE-TOKEN': 'test-token',
          },
          httpsAgent: providerHttpsAgent,
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
          timeout: PROVIDER_REQUEST_TIMEOUT_MS,
          headers: {
            'Content-Type': 'application/json',
            'PRIVATE-TOKEN': 'test-token',
          },
          httpsAgent: providerHttpsAgent,
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
            // The tree reports the path and the SHA of what it holds, which
            // is everything the diff needs.
            return Promise.resolve({
              data: [
                {
                  path: 'existing-file.txt',
                  type: 'blob',
                  id: gitBlobSha('old-content'),
                  mode: '100644',
                },
              ],
              headers: {},
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

      it('downloads no file to work out what changed', () => {
        // The tree already carries a SHA per path, so the diff needs no
        // `GET /repository/files/<path>` at all.
        const fileCalls = mockAxiosInstance.get.mock.calls.filter(
          (call) =>
            typeof call[0] === 'string' &&
            call[0].includes('/repository/files/'),
        );
        expect(fileCalls).toHaveLength(0);
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
              data: [
                {
                  path: 'file1.txt',
                  type: 'blob',
                  id: gitBlobSha('existing-content'),
                  mode: '100644',
                },
              ],
              headers: {},
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
        ).rejects.toBeInstanceOf(NoFilesToCommitError);
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

    describe('when GitLab refuses the commit (403)', () => {
      const files = [{ path: 'file1.txt', content: 'content1' }];

      beforeEach(() => {
        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (url.includes('/repository/tree')) {
            return Promise.resolve({ data: [], headers: {} });
          }
          return Promise.reject({ response: { status: 404 } });
        });
        mockAxiosInstance.post.mockRejectedValue({
          response: { status: 403 },
          message: 'Forbidden',
        });
      });

      it('throws a forbidden domain error', async () => {
        await expect(
          gitlabRepository.commitFiles(files, 'Test commit'),
        ).rejects.toBeInstanceOf(GitRemoteAccessForbiddenError);
      });

      it('names the write access the token is missing', async () => {
        await expect(
          gitlabRepository.commitFiles(files, 'Test commit'),
        ).rejects.toThrow(
          "Access to the GitLab repository testowner/testrepo was refused. Check that the connection's token has write access.",
        );
      });
    });

    describe('when GitLab cannot find the repository to commit to (404)', () => {
      const files = [{ path: 'file1.txt', content: 'content1' }];

      beforeEach(() => {
        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (url.includes('/repository/tree')) {
            return Promise.resolve({ data: [], headers: {} });
          }
          return Promise.reject({ response: { status: 404 } });
        });
        mockAxiosInstance.post.mockRejectedValue({
          response: { status: 404 },
          message: 'Not Found',
        });
      });

      it('throws a not found domain error', async () => {
        await expect(
          gitlabRepository.commitFiles(files, 'Test commit'),
        ).rejects.toBeInstanceOf(GitRemoteRepositoryNotFoundError);
      });

      it('keeps both readings of a 404 in the message', async () => {
        await expect(
          gitlabRepository.commitFiles(files, 'Test commit'),
        ).rejects.toThrow(
          "The GitLab repository testowner/testrepo was not found. Check that the path is correct and that the connection's token has access to it.",
        );
      });
    });

    describe('when path normalization handles leading/trailing slashes', () => {
      it('treats paths with leading slashes as equivalent', async () => {
        const files = [{ path: '/path/to/file.txt', content: 'content' }];

        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (url.includes('/repository/tree')) {
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
        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (url.includes('/repository/tree')) {
            return Promise.resolve({
              data: [
                { path: 'file-to-delete.txt', type: 'blob' },
                { path: 'another-file-to-delete.txt', type: 'blob' },
              ],
              headers: {},
            });
          }
          return Promise.reject({ response: { status: 404 } });
        });

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
                return Promise.resolve({
                  data: [{ path: 'file-on-page-1.txt', type: 'blob' }],
                  headers: { 'x-next-page': '2' },
                });
              }
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

    describe('when files have executable permissions', () => {
      beforeEach(() => {
        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (url.includes('/repository/tree')) {
            return Promise.resolve({ data: [], headers: {} });
          }
          return Promise.reject({ response: { status: 404 } });
        });

        mockAxiosInstance.post.mockResolvedValue({
          data: {
            id: 'commit-sha-perm',
            author_email: 'test@example.com',
            web_url:
              'https://gitlab.com/testowner/testrepo/-/commit/commit-sha-perm',
          },
        });
      });

      it('adds chmod action for files with executable permissions', async () => {
        const files = [
          {
            path: 'scripts/run.sh',
            content: '#!/bin/bash',
            permissions: 'rwxr-xr-x',
          },
        ];

        await gitlabRepository.commitFiles(files, 'Add script');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/projects/testowner%2Ftestrepo/repository/commits',
          {
            branch: 'main',
            commit_message: 'Add script',
            actions: [
              {
                action: 'create',
                file_path: 'scripts/run.sh',
                content: '#!/bin/bash',
              },
              {
                action: 'chmod',
                file_path: 'scripts/run.sh',
                execute_filemode: true,
              },
            ],
          },
        );
      });

      it('does not add chmod action for non-executable files', async () => {
        const files = [
          { path: 'data.txt', content: 'data', permissions: 'rw-r--r--' },
        ];

        await gitlabRepository.commitFiles(files, 'Add data');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/projects/testowner%2Ftestrepo/repository/commits',
          {
            branch: 'main',
            commit_message: 'Add data',
            actions: [
              { action: 'create', file_path: 'data.txt', content: 'data' },
            ],
          },
        );
      });
    });

    describe('when only permissions change (content identical)', () => {
      const existingContent = 'existing script content';

      beforeEach(() => {
        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (url.includes('/repository/tree')) {
            return Promise.resolve({
              data: [
                {
                  path: 'scripts/run.sh',
                  type: 'blob',
                  id: gitBlobSha(existingContent),
                  mode: '100644',
                },
              ],
              headers: {},
            });
          }
          return Promise.reject({ response: { status: 404 } });
        });

        mockAxiosInstance.post.mockResolvedValue({
          data: {
            id: 'commit-sha-chmod',
            author_email: 'test@example.com',
            web_url:
              'https://gitlab.com/testowner/testrepo/-/commit/commit-sha-chmod',
          },
        });
      });

      describe('when executable permissions are requested', () => {
        let result: Awaited<ReturnType<typeof gitlabRepository.commitFiles>>;

        beforeEach(async () => {
          const files = [
            {
              path: 'scripts/run.sh',
              content: existingContent,
              permissions: 'rwxr-xr-x',
            },
          ];

          result = await gitlabRepository.commitFiles(files, 'Fix permissions');
        });

        it('creates a commit', async () => {
          expect(result.sha).not.toBe('no-changes');
        });

        it('includes chmod action', async () => {
          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
            '/projects/testowner%2Ftestrepo/repository/commits',
            expect.objectContaining({
              actions: expect.arrayContaining([
                {
                  action: 'chmod',
                  file_path: 'scripts/run.sh',
                  execute_filemode: true,
                },
              ]),
            }),
          );
        });
      });

      describe('when no executable permissions are requested', () => {
        it('returns no-changes', async () => {
          const files = [
            {
              path: 'scripts/run.sh',
              content: existingContent,
              permissions: 'rw-r--r--',
            },
          ];

          const result = await gitlabRepository.commitFiles(files, 'No change');

          expect(result.sha).toBe('no-changes');
        });
      });
    });

    describe('when removing executable bit from an existing executable file', () => {
      const existingContent = 'existing script content';

      beforeEach(() => {
        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (url.includes('/repository/tree')) {
            return Promise.resolve({
              data: [
                {
                  path: 'scripts/run.sh',
                  type: 'blob',
                  id: gitBlobSha(existingContent),
                  mode: '100755',
                },
              ],
              headers: {},
            });
          }
          return Promise.reject({ response: { status: 404 } });
        });

        mockAxiosInstance.post.mockResolvedValue({
          data: {
            id: 'commit-sha-chmod-remove',
            author_email: 'test@example.com',
            web_url:
              'https://gitlab.com/testowner/testrepo/-/commit/commit-sha-chmod-remove',
          },
        });
      });

      it('emits chmod action with execute_filemode false', async () => {
        const files = [
          {
            path: 'scripts/run.sh',
            content: existingContent,
            permissions: 'rw-r--r--',
          },
        ];

        await gitlabRepository.commitFiles(files, 'Remove executable bit');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/projects/testowner%2Ftestrepo/repository/commits',
          {
            branch: 'main',
            commit_message: 'Remove executable bit',
            actions: [
              {
                action: 'chmod',
                file_path: 'scripts/run.sh',
                execute_filemode: false,
              },
            ],
          },
        );
      });

      it('creates a commit', async () => {
        const files = [
          {
            path: 'scripts/run.sh',
            content: existingContent,
            permissions: 'rw-r--r--',
          },
        ];

        const result = await gitlabRepository.commitFiles(
          files,
          'Remove executable bit',
        );

        expect(result.sha).not.toBe('no-changes');
      });
    });

    describe('when only permissions change, commit excludes unchanged update action', () => {
      const existingContent = 'existing script content';

      beforeEach(() => {
        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (url.includes('/repository/tree')) {
            return Promise.resolve({
              data: [
                {
                  path: 'scripts/run.sh',
                  type: 'blob',
                  id: gitBlobSha(existingContent),
                  mode: '100644',
                },
              ],
              headers: {},
            });
          }
          return Promise.reject({ response: { status: 404 } });
        });

        mockAxiosInstance.post.mockResolvedValue({
          data: {
            id: 'commit-sha-perm-only',
            author_email: 'test@example.com',
            web_url:
              'https://gitlab.com/testowner/testrepo/-/commit/commit-sha-perm-only',
          },
        });
      });

      it('includes only the chmod action, not an update action', async () => {
        const files = [
          {
            path: 'scripts/run.sh',
            content: existingContent,
            permissions: 'rwxr-xr-x',
          },
        ];

        await gitlabRepository.commitFiles(files, 'Add executable permission');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/projects/testowner%2Ftestrepo/repository/commits',
          {
            branch: 'main',
            commit_message: 'Add executable permission',
            actions: [
              {
                action: 'chmod',
                file_path: 'scripts/run.sh',
                execute_filemode: true,
              },
            ],
          },
        );
      });
    });

    describe('when file is already executable and content is unchanged', () => {
      const existingContent = 'existing script content';

      beforeEach(() => {
        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (url.includes('/repository/tree')) {
            return Promise.resolve({
              data: [
                {
                  path: 'scripts/run.sh',
                  type: 'blob',
                  id: gitBlobSha(existingContent),
                  mode: '100755',
                },
              ],
              headers: {},
            });
          }
          return Promise.reject({ response: { status: 404 } });
        });
      });

      it('returns no-changes', async () => {
        const files = [
          {
            path: 'scripts/run.sh',
            content: existingContent,
            permissions: 'rwxr-xr-x',
          },
        ];

        const result = await gitlabRepository.commitFiles(
          files,
          'Should not commit',
        );

        expect(result.sha).toBe('no-changes');
      });

      it('does not create a commit', async () => {
        const files = [
          {
            path: 'scripts/run.sh',
            content: existingContent,
            permissions: 'rwxr-xr-x',
          },
        ];

        await gitlabRepository.commitFiles(files, 'Should not commit');

        expect(mockAxiosInstance.post).not.toHaveBeenCalled();
      });
    });

    describe('when committing many existing files', () => {
      // Pins that the request count does not follow the file count.
      const manyFiles = Array.from({ length: 25 }, (_, i) => ({
        path: `file-${i}.txt`,
        content: `new-content-${i}`,
      }));

      beforeEach(() => {
        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (url.includes('/repository/tree')) {
            return Promise.resolve({
              data: manyFiles.map((f) => ({
                path: f.path,
                type: 'blob',
                id: gitBlobSha('old-content'),
                mode: '100644',
              })),
              headers: {},
            });
          }
          return Promise.reject({ response: { status: 404 } });
        });

        mockAxiosInstance.post.mockResolvedValue({
          data: {
            id: 'commit-sha',
            author_email: 'test@example.com',
            web_url: 'https://gitlab.com/test/-/commit/commit-sha',
          },
        });
      });

      it('downloads no file to work out what changed', async () => {
        await gitlabRepository.commitFiles(manyFiles, 'Batch test');

        const fileCalls = mockAxiosInstance.get.mock.calls.filter(
          (call) =>
            typeof call[0] === 'string' &&
            call[0].includes('/repository/files/'),
        );
        expect(fileCalls).toHaveLength(0);
      });

      it('reads the tree once however many files are committed', async () => {
        await gitlabRepository.commitFiles(manyFiles, 'Batch test');

        const treeCalls = mockAxiosInstance.get.mock.calls.filter(
          (call) =>
            typeof call[0] === 'string' && call[0].includes('/repository/tree'),
        );
        expect(treeCalls).toHaveLength(1);
      });

      it('still commits every changed file', async () => {
        await gitlabRepository.commitFiles(manyFiles, 'Batch test');

        const [, commitPayload] = mockAxiosInstance.post.mock.calls[0];
        expect((commitPayload as { actions: unknown[] }).actions).toHaveLength(
          25,
        );
      });

      describe('when a file differs from the repository copy only by line endings', () => {
        // The hash covers the exact bytes that would be written, with no
        // normalisation, so CRLF and LF are two different files.
        const lfContent = 'line one\nline two\n';
        const crlfContent = 'line one\r\nline two\r\n';

        beforeEach(() => {
          mockAxiosInstance.get.mockImplementation((url: string) => {
            if (url.includes('/repository/tree')) {
              return Promise.resolve({
                data: [
                  {
                    path: 'notes.txt',
                    type: 'blob',
                    id: gitBlobSha(lfContent),
                    mode: '100644',
                  },
                ],
                headers: {},
              });
            }
            return Promise.reject({ response: { status: 404 } });
          });

          mockAxiosInstance.post.mockResolvedValue({
            data: {
              id: 'commit-sha-line-endings',
              author_email: 'test@example.com',
              web_url:
                'https://gitlab.com/test/-/commit/commit-sha-line-endings',
            },
          });
        });

        it('counts the file as changed', async () => {
          await gitlabRepository.commitFiles(
            [{ path: 'notes.txt', content: crlfContent }],
            'Rewrite with CRLF',
          );

          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
            '/projects/testowner%2Ftestrepo/repository/commits',
            expect.objectContaining({
              actions: [
                {
                  action: 'update',
                  file_path: 'notes.txt',
                  content: crlfContent,
                },
              ],
            }),
          );
        });

        it('counts the same line endings as unchanged', async () => {
          const result = await gitlabRepository.commitFiles(
            [{ path: 'notes.txt', content: lfContent }],
            'No change',
          );

          expect(result.sha).toBe('no-changes');
        });
      });

      describe('when the tree reports no SHA for an existing path', () => {
        // Nothing in the response guarantees the SHA, and committing a file
        // that turns out identical costs one action where skipping a changed
        // one loses the change — so "cannot tell" commits.
        beforeEach(() => {
          mockAxiosInstance.get.mockImplementation((url: string) => {
            if (url.includes('/repository/tree')) {
              return Promise.resolve({
                data: [{ path: 'notes.txt', type: 'blob', mode: '100644' }],
                headers: {},
              });
            }
            return Promise.reject({ response: { status: 404 } });
          });

          mockAxiosInstance.post.mockResolvedValue({
            data: {
              id: 'commit-sha-unknown',
              author_email: 'test@example.com',
              web_url: 'https://gitlab.com/test/-/commit/commit-sha-unknown',
            },
          });
        });

        it('updates the file rather than skipping it', async () => {
          await gitlabRepository.commitFiles(
            [{ path: 'notes.txt', content: 'some content' }],
            'Unknown SHA',
          );

          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
            '/projects/testowner%2Ftestrepo/repository/commits',
            expect.objectContaining({
              actions: [
                {
                  action: 'update',
                  file_path: 'notes.txt',
                  content: 'some content',
                },
              ],
            }),
          );
        });
      });

      describe('when committing a mix of existing and new files', () => {
        let actions: Array<{ action: string; file_path: string }>;

        beforeEach(async () => {
          const files = [
            { path: 'existing-1.txt', content: 'new-1' },
            { path: 'existing-2.txt', content: 'new-2' },
            { path: 'new-file.txt', content: 'new-content' },
          ];

          mockAxiosInstance.get.mockImplementation((url: string) => {
            if (url.includes('/repository/tree')) {
              return Promise.resolve({
                data: [
                  {
                    path: 'existing-1.txt',
                    type: 'blob',
                    id: gitBlobSha('old-content'),
                    mode: '100644',
                  },
                  {
                    path: 'existing-2.txt',
                    type: 'blob',
                    id: gitBlobSha('old-content'),
                    mode: '100644',
                  },
                ],
                headers: {},
              });
            }
            return Promise.reject({ response: { status: 404 } });
          });

          mockAxiosInstance.post.mockResolvedValue({
            data: {
              id: 'commit-sha',
              author_email: 'test@example.com',
              web_url: 'https://gitlab.com/test/-/commit/commit-sha',
            },
          });

          await gitlabRepository.commitFiles(files, 'Mixed test');

          const [, commitPayload] = mockAxiosInstance.post.mock.calls[0];
          actions = (commitPayload as { actions: typeof actions }).actions;
        });

        it('uses update action for existing files', () => {
          const updateActions = actions.filter(
            (a: { action: string }) => a.action === 'update',
          );
          expect(updateActions).toHaveLength(2);
        });

        it('uses create action for new files', () => {
          const createActions = actions.filter(
            (a: { action: string }) => a.action === 'create',
          );
          expect(createActions).toHaveLength(1);
        });

        it('assigns create action to the correct file', () => {
          const createActions = actions.filter(
            (a: { action: string }) => a.action === 'create',
          );
          expect(createActions[0].file_path).toBe('new-file.txt');
        });
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
          execute_filemode: false,
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

  describe('createBranchFromBase', () => {
    const encodedProjectPath = encodeURIComponent('testowner/testrepo');

    describe('when the target branch already exists', () => {
      beforeEach(async () => {
        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (
            url.includes(`/projects/${encodedProjectPath}/repository/branches/`)
          ) {
            return Promise.resolve({ data: { name: 'packmind/sync' } });
          }
          return Promise.reject(new Error(`Unexpected GET: ${url}`));
        });

        await gitlabRepository.createBranchFromBase('packmind/sync');
      });

      it('does not POST a new branch', () => {
        expect(mockAxiosInstance.post).not.toHaveBeenCalled();
      });
    });

    describe('when the target branch is missing', () => {
      beforeEach(async () => {
        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (
            url.includes(`/projects/${encodedProjectPath}/repository/branches/`)
          ) {
            return Promise.reject({ response: { status: 404 } });
          }
          return Promise.reject(new Error(`Unexpected GET: ${url}`));
        });
        mockAxiosInstance.post.mockResolvedValue({ data: {} });

        await gitlabRepository.createBranchFromBase('packmind/sync');
      });

      it('creates the target branch from the base branch', () => {
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          `/projects/${encodedProjectPath}/repository/branches`,
          null,
          {
            params: {
              branch: 'packmind/sync',
              ref: 'main',
            },
          },
        );
      });
    });

    describe('when probing the target branch fails with a non-404 error', () => {
      beforeEach(() => {
        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (
            url.includes(`/projects/${encodedProjectPath}/repository/branches/`)
          ) {
            return Promise.reject(new Error('Boom'));
          }
          return Promise.reject(new Error(`Unexpected GET: ${url}`));
        });
      });

      it('propagates the error without attempting to create the branch', async () => {
        await expect(
          gitlabRepository.createBranchFromBase('packmind/sync'),
        ).rejects.toThrow(
          `Failed to ensure branch 'packmind/sync' on GitLab: Boom`,
        );
      });
    });
  });

  describe('compareBranches', () => {
    const encodedProjectPath = encodeURIComponent('testowner/testrepo');

    describe('when GitLab returns a diff list', () => {
      beforeEach(() => {
        mockAxiosInstance.get.mockResolvedValue({
          data: {
            diffs: [
              { new_path: 'plugins/a/skills/x/SKILL.md', new_file: true },
              { new_path: 'plugins/a/commands/y.md' },
              {
                old_path: 'plugins/b/skills/z/SKILL.md',
                new_path: 'plugins/b/skills/z/SKILL.md',
                deleted_file: true,
              },
            ],
          },
        });
      });

      it('normalizes each diff to a path and status', async () => {
        const result = await gitlabRepository.compareBranches(
          'main',
          'packmind/sync',
        );

        expect(result.files).toEqual([
          { path: 'plugins/a/skills/x/SKILL.md', status: 'added' },
          { path: 'plugins/a/commands/y.md', status: 'modified' },
          { path: 'plugins/b/skills/z/SKILL.md', status: 'removed' },
        ]);
      });

      it('requests the compare endpoint with from and to', async () => {
        await gitlabRepository.compareBranches('main', 'packmind/sync');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          `/projects/${encodedProjectPath}/repository/compare`,
          { params: { from: 'main', to: 'packmind/sync' } },
        );
      });
    });

    describe('when a file was renamed', () => {
      it('reports the old path as removed and the new path as added', async () => {
        mockAxiosInstance.get.mockResolvedValue({
          data: {
            diffs: [
              {
                old_path: 'plugins/a/skills/old-name/SKILL.md',
                new_path: 'plugins/a/skills/new-name/SKILL.md',
                renamed_file: true,
              },
            ],
          },
        });

        const result = await gitlabRepository.compareBranches(
          'main',
          'packmind/sync',
        );

        expect(result.files).toEqual([
          { path: 'plugins/a/skills/new-name/SKILL.md', status: 'added' },
          { path: 'plugins/a/skills/old-name/SKILL.md', status: 'removed' },
        ]);
      });
    });

    describe('when GitLab times the comparison out', () => {
      it('flags the comparison as truncated', async () => {
        mockAxiosInstance.get.mockResolvedValue({
          data: { diffs: [], compare_timeout: true },
        });

        const result = await gitlabRepository.compareBranches(
          'main',
          'packmind/sync',
        );

        expect(result.truncated).toBe(true);
      });
    });

    describe('when one of the branches does not exist', () => {
      it('returns an empty comparison', async () => {
        mockAxiosInstance.get.mockRejectedValue({
          response: { status: 404, data: { message: '404 Not Found' } },
        });

        const result = await gitlabRepository.compareBranches(
          'main',
          'packmind/sync',
        );

        expect(result).toEqual({ files: [], truncated: false });
      });
    });

    describe('when GitLab fails with a non-404 error', () => {
      it('propagates an error naming both refs', async () => {
        mockAxiosInstance.get.mockRejectedValue(new Error('GitLab 503'));

        await expect(
          gitlabRepository.compareBranches('main', 'packmind/sync'),
        ).rejects.toThrow(
          "Failed to compare 'main'...'packmind/sync' on GitLab: GitLab 503",
        );
      });
    });

    describe('when GitLab is throttling us', () => {
      it('raises the throttle rather than a generic upstream failure', async () => {
        const throttle = new Error(
          'Request failed with status code 429',
        ) as Error & {
          isAxiosError: true;
          response: { status: number; headers: Record<string, string> };
        };
        throttle.isAxiosError = true;
        throttle.response = { status: 429, headers: {} };
        mockAxiosInstance.get.mockRejectedValue(throttle);

        await expect(
          gitlabRepository.compareBranches('main', 'packmind/sync'),
        ).rejects.toBeInstanceOf(GitlabRateLimitedError);
      });
    });
  });

  describe('openOrUpdatePullRequest', () => {
    const encodedProjectPath = encodeURIComponent('testowner/testrepo');
    const command = {
      head: 'packmind/sync',
      title: 'Packmind sync',
      body: 'rolling MR body',
    };

    describe('when an open merge request already exists', () => {
      let result: { url: string; number: number; wasCreated: boolean };

      beforeEach(async () => {
        mockAxiosInstance.get.mockResolvedValue({
          data: [
            {
              iid: 7,
              web_url:
                'https://gitlab.com/testowner/testrepo/-/merge_requests/7',
            },
          ],
        });

        mockAxiosInstance.put.mockResolvedValue({ data: {} });

        result = await gitlabRepository.openOrUpdatePullRequest(command);
      });

      it('returns the existing merge request URL', () => {
        expect(result.url).toBe(
          'https://gitlab.com/testowner/testrepo/-/merge_requests/7',
        );
      });

      it('does not POST a new merge request', () => {
        expect(mockAxiosInstance.post).not.toHaveBeenCalled();
      });

      it('PUTs the refreshed title and description on the existing merge request', () => {
        expect(mockAxiosInstance.put).toHaveBeenCalledWith(
          `/projects/${encodedProjectPath}/merge_requests/7`,
          { title: 'Packmind sync', description: 'rolling MR body' },
        );
      });
    });

    describe('when refreshing the existing merge request fails', () => {
      let result: { url: string; number: number; wasCreated: boolean };

      beforeEach(async () => {
        mockAxiosInstance.get.mockResolvedValue({
          data: [
            {
              iid: 7,
              web_url:
                'https://gitlab.com/testowner/testrepo/-/merge_requests/7',
            },
          ],
        });
        mockAxiosInstance.put.mockRejectedValue(new Error('GitLab 500'));

        result = await gitlabRepository.openOrUpdatePullRequest(command);
      });

      it('still returns the existing merge request', () => {
        expect(result).toEqual({
          url: 'https://gitlab.com/testowner/testrepo/-/merge_requests/7',
          number: 7,
          wasCreated: false,
        });
      });
    });

    describe('when no open merge request exists', () => {
      let result: { url: string; number: number; wasCreated: boolean };

      beforeEach(async () => {
        mockAxiosInstance.get.mockResolvedValue({ data: [] });
        mockAxiosInstance.post.mockResolvedValue({
          data: {
            iid: 9,
            web_url: 'https://gitlab.com/testowner/testrepo/-/merge_requests/9',
          },
        });

        result = await gitlabRepository.openOrUpdatePullRequest(command);
      });

      it('POSTs a new merge request with the expected payload', () => {
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          `/projects/${encodedProjectPath}/merge_requests`,
          {
            source_branch: 'packmind/sync',
            target_branch: 'main',
            title: 'Packmind sync',
            description: 'rolling MR body',
          },
        );
      });

      it('reports wasCreated=true', () => {
        expect(result.wasCreated).toBe(true);
      });
    });

    describe('when the lookup fails with a non-404 error', () => {
      beforeEach(() => {
        mockAxiosInstance.get.mockRejectedValue(new Error('GitLab 503'));
      });

      it('propagates the error without attempting to create the merge request', async () => {
        await expect(
          gitlabRepository.openOrUpdatePullRequest(command),
        ).rejects.toThrow(
          `Failed to look up merge request on GitLab for 'packmind/sync' -> 'main': GitLab 503`,
        );
      });
    });
  });

  describe('findOpenPullRequest', () => {
    describe('when an open merge request exists', () => {
      it('returns the first open merge request mapped to url and number', async () => {
        mockAxiosInstance.get.mockResolvedValue({
          data: [
            {
              iid: 7,
              web_url:
                'https://gitlab.com/testowner/testrepo/-/merge_requests/7',
            },
          ],
        });

        const result =
          await gitlabRepository.findOpenPullRequest('packmind/sync');

        expect(result).toEqual({
          url: 'https://gitlab.com/testowner/testrepo/-/merge_requests/7',
          number: 7,
        });
      });

      it('queries the merge requests endpoint scoped to head and base branches', async () => {
        mockAxiosInstance.get.mockResolvedValue({ data: [] });

        await gitlabRepository.findOpenPullRequest('packmind/sync');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          '/projects/testowner%2Ftestrepo/merge_requests',
          {
            params: {
              source_branch: 'packmind/sync',
              target_branch: 'main',
              state: 'opened',
            },
          },
        );
      });
    });

    describe('when no open merge request exists', () => {
      it('returns null', async () => {
        mockAxiosInstance.get.mockResolvedValue({ data: [] });

        const result =
          await gitlabRepository.findOpenPullRequest('packmind/sync');

        expect(result).toBeNull();
      });
    });
  });

  describe('checkRepositoryExists', () => {
    describe('when the project endpoint returns 200', () => {
      it('reports the repository exists', async () => {
        mockAxiosInstance.get.mockResolvedValue({ data: {} });

        const result = await gitlabRepository.checkRepositoryExists();

        expect(result).toEqual({ exists: true });
      });
    });

    describe('when the project endpoint returns 404', () => {
      it('classifies the failure as repo_not_found', async () => {
        mockAxiosInstance.get.mockRejectedValue({ response: { status: 404 } });

        const result = await gitlabRepository.checkRepositoryExists();

        expect(result).toEqual({ exists: false, reason: 'repo_not_found' });
      });
    });

    describe('when the project endpoint returns 401', () => {
      it('classifies the failure as auth_failed', async () => {
        mockAxiosInstance.get.mockRejectedValue({ response: { status: 401 } });

        const result = await gitlabRepository.checkRepositoryExists();

        expect(result).toEqual({ exists: false, reason: 'auth_failed' });
      });
    });

    describe('when the project endpoint returns 403', () => {
      it('classifies the failure as auth_failed', async () => {
        mockAxiosInstance.get.mockRejectedValue({ response: { status: 403 } });

        const result = await gitlabRepository.checkRepositoryExists();

        expect(result).toEqual({ exists: false, reason: 'auth_failed' });
      });
    });

    describe('when the request fails with a network error', () => {
      it('classifies the failure as network_transient', async () => {
        mockAxiosInstance.get.mockRejectedValue(new Error('socket hang up'));

        const result = await gitlabRepository.checkRepositoryExists();

        expect(result).toEqual({ exists: false, reason: 'network_transient' });
      });
    });
  });
  describe('listFilesInDirectories', () => {
    const treeCalls = () =>
      (mockAxiosInstance.get as jest.Mock).mock.calls.filter(([url]) =>
        String(url).includes('/repository/tree'),
      ).length;

    beforeEach(() => {
      mockAxiosInstance.get.mockImplementation((url: string) => {
        if (url.includes('/repository/tree')) {
          return Promise.resolve({
            data: [
              { path: 'packmind/a/one.md', type: 'blob' },
              { path: 'packmind/a/two.md', type: 'blob' },
              { path: 'packmind/b/three.md', type: 'blob' },
              { path: 'packmind/c', type: 'tree' },
              { path: 'other/four.md', type: 'blob' },
            ],
            headers: {},
          });
        }
        return Promise.reject(new Error(`Unexpected GET: ${url}`));
      });
    });

    it('returns the files under every requested directory', async () => {
      const files = await gitlabRepository.listFilesInDirectories(
        ['packmind/a', 'packmind/b'],
        'main',
      );

      expect(files).toEqual([
        { path: 'packmind/a/one.md' },
        { path: 'packmind/a/two.md' },
        { path: 'packmind/b/three.md' },
      ]);
    });

    it('leaves out directories that were not asked for', async () => {
      const files = await gitlabRepository.listFilesInDirectories(
        ['packmind/b'],
        'main',
      );

      expect(files).toEqual([{ path: 'packmind/b/three.md' }]);
    });

    it('walks the tree once for one directory', async () => {
      await gitlabRepository.listFilesInDirectories(['packmind/a'], 'main');

      expect(treeCalls()).toBe(1);
    });

    describe('when many directories are requested', () => {
      it('still walks the tree once', async () => {
        // The whole point of the batched form: the request count must not
        // scale with the number of directories being deleted.
        await gitlabRepository.listFilesInDirectories(
          Array.from({ length: 50 }, (_, i) => `packmind/dir-${i}`),
          'main',
        );

        expect(treeCalls()).toBe(1);
      });
    });

    describe('when the tree is paginated', () => {
      it('walks every page once and returns files from all of them', async () => {
        mockAxiosInstance.get.mockImplementation((url: string) => {
          if (url.includes('page=2')) {
            return Promise.resolve({
              data: [{ path: 'packmind/a/two.md', type: 'blob' }],
              headers: {},
            });
          }
          if (url.includes('/repository/tree')) {
            return Promise.resolve({
              data: [{ path: 'packmind/a/one.md', type: 'blob' }],
              headers: { 'x-next-page': '2' },
            });
          }
          return Promise.reject(new Error(`Unexpected GET: ${url}`));
        });

        const files = await gitlabRepository.listFilesInDirectories(
          ['packmind/a', 'packmind/b'],
          'main',
        );

        expect(files).toEqual([
          { path: 'packmind/a/one.md' },
          { path: 'packmind/a/two.md' },
        ]);
      });
    });

    describe('when no directory is requested', () => {
      it('issues no request at all', async () => {
        await gitlabRepository.listFilesInDirectories([], 'main');

        expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      });
    });

    describe('when the tree cannot be read', () => {
      it('reports no files rather than failing the publish', async () => {
        mockAxiosInstance.get.mockRejectedValue(new Error('boom'));

        const files = await gitlabRepository.listFilesInDirectories(
          ['packmind/a'],
          'main',
        );

        expect(files).toEqual([]);
      });
    });
  });

  describe('listFilesInDirectory', () => {
    beforeEach(() => {
      mockAxiosInstance.get.mockImplementation((url: string) => {
        if (url.includes('/repository/tree')) {
          return Promise.resolve({
            data: [
              { path: 'packmind/a/one.md', type: 'blob' },
              { path: 'packmind/b/three.md', type: 'blob' },
            ],
            headers: {},
          });
        }
        return Promise.reject(new Error(`Unexpected GET: ${url}`));
      });
    });

    it('returns the files under the directory', async () => {
      const files = await gitlabRepository.listFilesInDirectory(
        'packmind/a',
        'main',
      );

      expect(files).toEqual([{ path: 'packmind/a/one.md' }]);
    });

    describe('when the path already ends with a slash', () => {
      it('returns the same files', async () => {
        const files = await gitlabRepository.listFilesInDirectory(
          'packmind/a/',
          'main',
        );

        expect(files).toEqual([{ path: 'packmind/a/one.md' }]);
      });
    });
  });

  describe('listDirectoriesOnRepo', () => {
    describe('when GitLab refuses the listing (403)', () => {
      beforeEach(() => {
        mockAxiosInstance.get.mockRejectedValue({ response: { status: 403 } });
      });

      it('throws a forbidden domain error', async () => {
        await expect(
          gitlabRepository.listDirectoriesOnRepo(
            'testrepo',
            'testowner',
            'main',
          ),
        ).rejects.toBeInstanceOf(GitRemoteAccessForbiddenError);
      });

      it('names the read access the token is missing', async () => {
        await expect(
          gitlabRepository.listDirectoriesOnRepo(
            'testrepo',
            'testowner',
            'main',
          ),
        ).rejects.toThrow(
          "Access to the GitLab repository testowner/testrepo was refused. Check that the connection's token has read access.",
        );
      });
    });

    describe('when GitLab cannot find the repository or the branch (404)', () => {
      beforeEach(() => {
        mockAxiosInstance.get.mockRejectedValue({ response: { status: 404 } });
      });

      it('throws a not found domain error', async () => {
        await expect(
          gitlabRepository.listDirectoriesOnRepo(
            'testrepo',
            'testowner',
            'main',
          ),
        ).rejects.toBeInstanceOf(GitRemoteRepositoryNotFoundError);
      });

      it('names the branch the listing asked for', async () => {
        await expect(
          gitlabRepository.listDirectoriesOnRepo(
            'testrepo',
            'testowner',
            'main',
          ),
        ).rejects.toThrow(
          "The GitLab repository testowner/testrepo or its branch 'main' was not found. Check that the path is correct and that the connection's token has access to it.",
        );
      });
    });
  });
});
