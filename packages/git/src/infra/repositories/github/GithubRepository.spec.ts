import axios from 'axios';
import { GithubRepository, GithubRepositoryOptions } from './GithubRepository';
import { IGithubTokenResolver } from '../../../domain/repositories/IGithubTokenResolver';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const stubResolver = (): IGithubTokenResolver => ({
  getToken: jest.fn().mockResolvedValue('test-github-token'),
  onUnauthorized: jest.fn().mockResolvedValue(undefined),
  getKind: jest.fn().mockReturnValue('user'),
});

describe('GithubRepository', () => {
  let githubRepository: GithubRepository;
  let mockAxiosInstance: jest.Mocked<typeof axios>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const options: GithubRepositoryOptions = {
    owner: 'test-owner',
    repo: 'test-repo',
  };

  beforeEach(() => {
    mockAxiosInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    } as unknown as jest.Mocked<typeof axios>;
    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    stubbedLogger = stubLogger();
    githubRepository = new GithubRepository(
      stubResolver(),
      options,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('creates an axios instance with the correct base configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.github.com',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
      });
    });

    describe('when registering interceptors for token injection', () => {
      it('registers a request interceptor', () => {
        expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      });

      it('registers a response interceptor', () => {
        expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
      });
    });
  });

  describe('commitFiles', () => {
    // Sample files to commit
    const files = [
      { path: 'test/file1.txt', content: 'test content 1' },
      { path: 'test/file2.txt', content: 'test content 2' },
    ];

    // Mock responses for Git Data API
    const refSha = 'ref-sha-123';
    const baseTreeSha = 'base-tree-sha-456';
    const newTreeSha = 'new-tree-sha-789';
    const newCommitSha = 'new-commit-sha-abc';

    // Default tree items returned by the tree fetch (for filtering deletions)
    const defaultTreeItems = [
      {
        path: 'test/file-to-delete.txt',
        type: 'blob',
        sha: 'existing-sha-1',
        mode: '100644',
      },
      {
        path: 'test/another-file-to-delete.txt',
        type: 'blob',
        sha: 'existing-sha-2',
        mode: '100644',
      },
    ];

    beforeEach(() => {
      // Mock GET request for reference
      mockAxiosInstance.get = jest.fn().mockImplementation((url) => {
        if (url.includes('/git/refs/heads/')) {
          return Promise.resolve({
            data: {
              object: {
                sha: refSha,
              },
            },
          });
        } else if (url.includes('/git/commits/')) {
          return Promise.resolve({
            data: {
              tree: {
                sha: baseTreeSha,
              },
            },
          });
        } else if (url.includes('/git/trees/')) {
          // Return the tree structure for filtering deletions
          return Promise.resolve({
            data: {
              sha: baseTreeSha,
              tree: defaultTreeItems,
            },
          });
        } else if (url.includes('/contents/')) {
          // This will be overridden in specific tests
          return Promise.reject({ response: { status: 404 } });
        }
        return Promise.reject(new Error(`Unexpected GET request: ${url}`));
      });

      // Mock POST request for creating tree
      mockAxiosInstance.post = jest.fn().mockImplementation((url) => {
        if (url.includes('/git/trees')) {
          return Promise.resolve({
            data: {
              sha: newTreeSha,
            },
          });
        } else if (url.includes('/git/commits')) {
          return Promise.resolve({
            data: {
              sha: newCommitSha,
              message: `Add multiple files including ${files[0].path}`,
              author: {
                email: 'test@example.com',
              },
              committer: {
                email: 'test@example.com',
              },
              html_url: `https://github.com/${options.owner}/${options.repo}/commit/${newCommitSha}`,
            },
          });
        }
        return Promise.reject(new Error(`Unexpected POST request: ${url}`));
      });

      // Mock PATCH request for updating reference
      mockAxiosInstance.patch = jest.fn().mockResolvedValue({
        data: {
          ref: `refs/heads/main`,
          object: {
            sha: newCommitSha,
          },
        },
      });
    });

    describe('when files do not exist', () => {
      let result: Awaited<ReturnType<typeof githubRepository.commitFiles>>;

      beforeEach(async () => {
        jest.spyOn(githubRepository, 'getFileOnRepo').mockResolvedValue(null);
        result = await githubRepository.commitFiles(files, 'Commit message');
      });

      it('fetches the branch reference', () => {
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/refs/heads/main`,
        );
      });

      it('fetches the commit for the reference', () => {
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/commits/${refSha}`,
        );
      });

      it('checks if each file exists on the repo', () => {
        files.forEach((file) => {
          expect(githubRepository.getFileOnRepo).toHaveBeenCalledWith(
            file.path,
            'main',
          );
        });
      });

      it('creates the tree with file contents', () => {
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/trees`,
          {
            base_tree: baseTreeSha,
            tree: files.map((file) => ({
              path: file.path,
              mode: '100644',
              type: 'blob',
              content: file.content,
            })),
          },
        );
      });

      it('creates the commit with the correct message', () => {
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/commits`,
          {
            message: 'Commit message',
            tree: newTreeSha,
            parents: [refSha],
          },
        );
      });

      it('updates the branch reference', () => {
        expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/refs/heads/main`,
          {
            sha: newCommitSha,
            force: false,
          },
        );
      });

      it('returns the commit data', () => {
        expect(result).toEqual({
          sha: newCommitSha,
          message: 'Commit message',
          author: 'test@example.com',
          url: `https://github.com/${options.owner}/${options.repo}/commit/${newCommitSha}`,
        });
      });
    });

    describe('when some files already exist', () => {
      let result: Awaited<ReturnType<typeof githubRepository.commitFiles>>;

      beforeEach(async () => {
        jest
          .spyOn(githubRepository, 'getFileOnRepo')
          .mockImplementation((path) => {
            if (path === files[0].path) {
              return Promise.resolve({
                sha: 'existing-file-sha',
                content: 'existing content',
              });
            }
            return Promise.resolve(null);
          });
        result = await githubRepository.commitFiles(files, 'Commit message');
      });

      it('creates the commit with the correct message', () => {
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/commits`,
          {
            message: 'Commit message',
            tree: newTreeSha,
            parents: [refSha],
          },
        );
      });

      it('returns the commit data', () => {
        expect(result).toEqual({
          sha: newCommitSha,
          message: 'Commit message',
          author: 'test@example.com',
          url: `https://github.com/${options.owner}/${options.repo}/commit/${newCommitSha}`,
        });
      });
    });

    describe('when a branch is provided', () => {
      const customBranch = 'my-feature';
      let result: Awaited<ReturnType<typeof githubRepository.commitFiles>>;

      beforeEach(async () => {
        stubbedLogger = stubLogger();
        githubRepository = new GithubRepository(
          stubResolver(),
          {
            ...options,
            branch: customBranch,
          },
          stubbedLogger,
        );

        jest.spyOn(githubRepository, 'getFileOnRepo').mockResolvedValue(null);
        result = await githubRepository.commitFiles(files, 'Commit message');
      });

      it('fetches the custom branch reference', () => {
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/refs/heads/${customBranch}`,
        );
      });

      it('checks if each file exists on the custom branch', () => {
        files.forEach((file) => {
          expect(githubRepository.getFileOnRepo).toHaveBeenCalledWith(
            file.path,
            customBranch,
          );
        });
      });

      it('updates the custom branch reference', () => {
        expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/refs/heads/${customBranch}`,
          {
            sha: newCommitSha,
            force: false,
          },
        );
      });

      it('returns the commit data', () => {
        expect(result).toEqual({
          sha: newCommitSha,
          message: 'Commit message',
          author: 'test@example.com',
          url: `https://github.com/${options.owner}/${options.repo}/commit/${newCommitSha}`,
        });
      });
    });

    describe('when the GitHub API request fails', () => {
      describe('when getting reference fails', () => {
        beforeEach(() => {
          mockAxiosInstance.get = jest
            .fn()
            .mockRejectedValue(new Error('API Error'));
        });

        it('throws an error', async () => {
          await expect(
            githubRepository.commitFiles(files, 'Commit message'),
          ).rejects.toThrow('Failed to commit files to GitHub: API Error');
        });
      });

      describe('when creating tree fails', () => {
        beforeEach(() => {
          mockAxiosInstance.post = jest
            .fn()
            .mockRejectedValue(new Error('Tree Creation Error'));
        });

        it('throws an error', async () => {
          await expect(
            githubRepository.commitFiles(files, 'Commit message'),
          ).rejects.toThrow(
            'Failed to commit files to GitHub: Tree Creation Error',
          );
        });
      });

      describe('when updating reference fails', () => {
        beforeEach(() => {
          mockAxiosInstance.patch = jest
            .fn()
            .mockRejectedValue(new Error('Reference Update Error'));
        });

        it('throws an error', async () => {
          await expect(
            githubRepository.commitFiles(files, 'Commit message'),
          ).rejects.toThrow(
            'Failed to commit files to GitHub: Reference Update Error',
          );
        });
      });
    });

    describe('when files array is empty', () => {
      it('throws an error', async () => {
        await expect(
          githubRepository.commitFiles([], 'Commit message'),
        ).rejects.toThrow('No files to commit');
      });
    });

    describe('when deleting files', () => {
      const deleteFiles = [
        { path: 'test/file-to-delete.txt' },
        { path: 'test/another-file-to-delete.txt' },
      ];

      beforeEach(() => {
        // Mock getFileOnRepo to return null for new files
        jest.spyOn(githubRepository, 'getFileOnRepo').mockResolvedValue(null);
      });

      it('creates tree items with sha null for deleted files', async () => {
        await githubRepository.commitFiles(
          files,
          'Commit message',
          deleteFiles,
        );

        // Verify tree creation includes both regular files and delete items
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/trees`,
          {
            base_tree: baseTreeSha,
            tree: [
              // Regular file items
              {
                path: files[0].path,
                mode: '100644',
                type: 'blob',
                content: files[0].content,
              },
              {
                path: files[1].path,
                mode: '100644',
                type: 'blob',
                content: files[1].content,
              },
              // Delete items with sha: null
              {
                path: deleteFiles[0].path,
                mode: '100644',
                type: 'blob',
                sha: null,
              },
              {
                path: deleteFiles[1].path,
                mode: '100644',
                type: 'blob',
                sha: null,
              },
            ],
          },
        );
      });

      describe('when deleting files alongside creating files', () => {
        it('returns commit data', async () => {
          const result = await githubRepository.commitFiles(
            files,
            'Commit message',
            deleteFiles,
          );

          expect(result).toEqual({
            sha: newCommitSha,
            message: 'Commit message',
            author: 'test@example.com',
            url: `https://github.com/${options.owner}/${options.repo}/commit/${newCommitSha}`,
          });
        });
      });
    });

    describe('when only deleting files without adding new ones', () => {
      const deleteFiles = [{ path: 'test/file-to-delete.txt' }];

      it('creates commit with only delete tree items', async () => {
        await githubRepository.commitFiles([], 'Delete file', deleteFiles);

        // Verify tree creation includes only delete items
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/trees`,
          {
            base_tree: baseTreeSha,
            tree: [
              {
                path: deleteFiles[0].path,
                mode: '100644',
                type: 'blob',
                sha: null,
              },
            ],
          },
        );
      });

      it('returns commit data', async () => {
        const result = await githubRepository.commitFiles(
          [],
          'Delete file',
          deleteFiles,
        );

        expect(result).toEqual({
          sha: newCommitSha,
          message: 'Delete file',
          author: 'test@example.com',
          url: `https://github.com/${options.owner}/${options.repo}/commit/${newCommitSha}`,
        });
      });
    });

    describe('when both files and deleteFiles are empty', () => {
      it('throws an error', async () => {
        await expect(
          githubRepository.commitFiles([], 'Commit message', []),
        ).rejects.toThrow('No files to commit');
      });
    });

    describe('when filtering non-existent files during deletion', () => {
      beforeEach(() => {
        // Mock getFileOnRepo to return null for new files
        jest.spyOn(githubRepository, 'getFileOnRepo').mockResolvedValue(null);
      });

      describe('when some files to delete do not exist in the repo', () => {
        const deleteFiles = [
          { path: 'test/file-to-delete.txt' }, // exists in defaultTreeItems
          { path: 'test/non-existent-file.txt' }, // does not exist
        ];

        it('deletes only files that exist in the repository', async () => {
          await githubRepository.commitFiles(
            files,
            'Commit message',
            deleteFiles,
          );

          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
            `/repos/${options.owner}/${options.repo}/git/trees`,
            {
              base_tree: baseTreeSha,
              tree: [
                {
                  path: files[0].path,
                  mode: '100644',
                  type: 'blob',
                  content: files[0].content,
                },
                {
                  path: files[1].path,
                  mode: '100644',
                  type: 'blob',
                  content: files[1].content,
                },
                {
                  path: 'test/file-to-delete.txt',
                  mode: '100644',
                  type: 'blob',
                  sha: null,
                },
              ],
            },
          );
        });
      });

      describe('when all files to delete do not exist in the repo', () => {
        const nonExistentDeleteFiles = [
          { path: 'test/non-existent-1.txt' },
          { path: 'test/non-existent-2.txt' },
        ];

        describe('with file modifications', () => {
          it('creates commit with only file modifications', async () => {
            await githubRepository.commitFiles(
              files,
              'Commit message',
              nonExistentDeleteFiles,
            );

            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
              `/repos/${options.owner}/${options.repo}/git/trees`,
              {
                base_tree: baseTreeSha,
                tree: [
                  {
                    path: files[0].path,
                    mode: '100644',
                    type: 'blob',
                    content: files[0].content,
                  },
                  {
                    path: files[1].path,
                    mode: '100644',
                    type: 'blob',
                    content: files[1].content,
                  },
                ],
              },
            );
          });
        });

        describe('without file modifications', () => {
          describe('when no existing files to delete', () => {
            it('returns no-changes', async () => {
              const result = await githubRepository.commitFiles(
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
              await githubRepository.commitFiles(
                [],
                'Delete files',
                nonExistentDeleteFiles,
              );

              expect(mockAxiosInstance.post).not.toHaveBeenCalledWith(
                expect.stringContaining('/git/commits'),
                expect.anything(),
              );
            });
          });
        });
      });

      describe('when files have identical content and delete files do not exist', () => {
        const existingContent = 'existing content';
        const filesWithIdenticalContent = [
          { path: 'test/unchanged-file.txt', content: existingContent },
        ];
        const nonExistentDeleteFiles = [{ path: 'test/non-existent-file.txt' }];

        beforeEach(() => {
          jest.spyOn(githubRepository, 'getFileOnRepo').mockResolvedValue({
            sha: 'existing-sha',
            content: Buffer.from(existingContent).toString('base64'),
          });
        });

        it('returns no-changes', async () => {
          const result = await githubRepository.commitFiles(
            filesWithIdenticalContent,
            'Update files',
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
          await githubRepository.commitFiles(
            filesWithIdenticalContent,
            'Update files',
            nonExistentDeleteFiles,
          );

          expect(mockAxiosInstance.post).not.toHaveBeenCalledWith(
            expect.stringContaining('/git/commits'),
            expect.anything(),
          );
        });
      });
    });

    describe('when files have executable permissions', () => {
      beforeEach(() => {
        jest.spyOn(githubRepository, 'getFileOnRepo').mockResolvedValue(null);
      });

      it('uses 100755 mode for files with executable permissions', async () => {
        const executableFiles = [
          {
            path: 'scripts/run.sh',
            content: '#!/bin/bash',
            permissions: 'rwxr-xr-x',
          },
        ];

        await githubRepository.commitFiles(executableFiles, 'Add script');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/trees`,
          expect.objectContaining({
            tree: [
              expect.objectContaining({
                path: 'scripts/run.sh',
                mode: '100755',
                type: 'blob',
              }),
            ],
          }),
        );
      });

      it('uses 100644 mode for files without permissions', async () => {
        const regularFiles = [{ path: 'readme.md', content: '# Readme' }];

        await githubRepository.commitFiles(regularFiles, 'Add readme');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/trees`,
          expect.objectContaining({
            tree: [
              expect.objectContaining({
                path: 'readme.md',
                mode: '100644',
                type: 'blob',
              }),
            ],
          }),
        );
      });

      it('uses 100644 mode for non-executable permissions', async () => {
        const nonExecFiles = [
          { path: 'data.txt', content: 'data', permissions: 'rw-r--r--' },
        ];

        await githubRepository.commitFiles(nonExecFiles, 'Add data');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/trees`,
          expect.objectContaining({
            tree: [
              expect.objectContaining({
                path: 'data.txt',
                mode: '100644',
                type: 'blob',
              }),
            ],
          }),
        );
      });
    });

    describe('when only permissions change (content identical)', () => {
      const existingContent = 'existing script content';

      beforeEach(() => {
        jest.spyOn(githubRepository, 'getFileOnRepo').mockResolvedValue({
          sha: 'existing-sha',
          content: Buffer.from(existingContent).toString('base64'),
        });

        // Override tree to include the file with 100644 mode
        mockAxiosInstance.get = jest.fn().mockImplementation((url) => {
          if (url.includes('/git/refs/')) {
            return Promise.resolve({ data: { object: { sha: refSha } } });
          } else if (url.includes('/git/commits/')) {
            return Promise.resolve({ data: { tree: { sha: baseTreeSha } } });
          } else if (url.includes('/git/trees/')) {
            return Promise.resolve({
              data: {
                sha: baseTreeSha,
                tree: [
                  {
                    path: 'scripts/run.sh',
                    type: 'blob',
                    sha: 'existing-sha',
                    mode: '100644',
                  },
                ],
              },
            });
          }
          return Promise.reject(new Error(`Unexpected GET: ${url}`));
        });
      });

      describe('when mode differs from desired', () => {
        let result: Awaited<ReturnType<typeof githubRepository.commitFiles>>;

        beforeEach(async () => {
          const filesWithPermissionOnly = [
            {
              path: 'scripts/run.sh',
              content: existingContent,
              permissions: 'rwxr-xr-x',
            },
          ];

          result = await githubRepository.commitFiles(
            filesWithPermissionOnly,
            'Fix permissions',
          );
        });

        it('detects permission change', async () => {
          expect(result.sha).not.toBe('no-changes');
        });

        it('creates tree with 100755 mode', async () => {
          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
            `/repos/${options.owner}/${options.repo}/git/trees`,
            expect.objectContaining({
              tree: [
                expect.objectContaining({
                  path: 'scripts/run.sh',
                  mode: '100755',
                }),
              ],
            }),
          );
        });
      });

      describe('when permissions already match', () => {
        beforeEach(() => {
          // Override tree to have 100755 already
          mockAxiosInstance.get = jest.fn().mockImplementation((url) => {
            if (url.includes('/git/refs/')) {
              return Promise.resolve({ data: { object: { sha: refSha } } });
            } else if (url.includes('/git/commits/')) {
              return Promise.resolve({ data: { tree: { sha: baseTreeSha } } });
            } else if (url.includes('/git/trees/')) {
              return Promise.resolve({
                data: {
                  sha: baseTreeSha,
                  tree: [
                    {
                      path: 'scripts/run.sh',
                      type: 'blob',
                      sha: 'existing-sha',
                      mode: '100755',
                    },
                  ],
                },
              });
            }
            return Promise.reject(new Error(`Unexpected GET: ${url}`));
          });
        });

        it('returns no-changes', async () => {
          const filesWithSamePermissions = [
            {
              path: 'scripts/run.sh',
              content: existingContent,
              permissions: 'rwxr-xr-x',
            },
          ];

          const result = await githubRepository.commitFiles(
            filesWithSamePermissions,
            'No change',
          );

          expect(result.sha).toBe('no-changes');
        });
      });

      describe('when removing executable bit (100755 to 100644)', () => {
        beforeEach(() => {
          // Override tree to have 100755
          mockAxiosInstance.get = jest.fn().mockImplementation((url) => {
            if (url.includes('/git/refs/')) {
              return Promise.resolve({ data: { object: { sha: refSha } } });
            } else if (url.includes('/git/commits/')) {
              return Promise.resolve({ data: { tree: { sha: baseTreeSha } } });
            } else if (url.includes('/git/trees/')) {
              return Promise.resolve({
                data: {
                  sha: baseTreeSha,
                  tree: [
                    {
                      path: 'scripts/run.sh',
                      type: 'blob',
                      sha: 'existing-sha',
                      mode: '100755',
                    },
                  ],
                },
              });
            }
            return Promise.reject(new Error(`Unexpected GET: ${url}`));
          });
        });

        it('creates tree with 100644 mode', async () => {
          const filesRemoveExec = [
            {
              path: 'scripts/run.sh',
              content: existingContent,
              permissions: 'rw-r--r--',
            },
          ];

          await githubRepository.commitFiles(
            filesRemoveExec,
            'Remove executable bit',
          );

          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
            `/repos/${options.owner}/${options.repo}/git/trees`,
            expect.objectContaining({
              tree: [
                expect.objectContaining({
                  path: 'scripts/run.sh',
                  mode: '100644',
                }),
              ],
            }),
          );
        });
      });
    });

    describe('when content changes on a 100755 file without permissions field', () => {
      const existingContent = 'old script content';
      const newContent = 'new script content';

      beforeEach(() => {
        jest.spyOn(githubRepository, 'getFileOnRepo').mockResolvedValue({
          sha: 'existing-sha',
          content: Buffer.from(existingContent).toString('base64'),
        });

        mockAxiosInstance.get = jest.fn().mockImplementation((url) => {
          if (url.includes('/git/refs/')) {
            return Promise.resolve({ data: { object: { sha: refSha } } });
          } else if (url.includes('/git/commits/')) {
            return Promise.resolve({ data: { tree: { sha: baseTreeSha } } });
          } else if (url.includes('/git/trees/')) {
            return Promise.resolve({
              data: {
                sha: baseTreeSha,
                tree: [
                  {
                    path: 'scripts/run.sh',
                    type: 'blob',
                    sha: 'existing-sha',
                    mode: '100755',
                  },
                ],
              },
            });
          }
          return Promise.reject(new Error(`Unexpected GET: ${url}`));
        });
      });

      it('preserves existing 100755 mode', async () => {
        const filesWithoutPermissions = [
          {
            path: 'scripts/run.sh',
            content: newContent,
          },
        ];

        await githubRepository.commitFiles(
          filesWithoutPermissions,
          'Update script content',
        );

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/trees`,
          expect.objectContaining({
            tree: [
              expect.objectContaining({
                path: 'scripts/run.sh',
                mode: '100755',
              }),
            ],
          }),
        );
      });
    });
  });

  describe('createBranchFromBase', () => {
    const baseBranchSha = 'base-branch-sha-abc';

    describe('when the target branch already exists', () => {
      beforeEach(async () => {
        mockAxiosInstance.get = jest.fn().mockImplementation((url) => {
          if (
            url ===
            `/repos/${options.owner}/${options.repo}/git/refs/heads/packmind/sync`
          ) {
            return Promise.resolve({
              data: { object: { sha: 'existing-sync-sha' } },
            });
          }
          return Promise.reject(new Error(`Unexpected GET: ${url}`));
        });
        mockAxiosInstance.post = jest.fn();

        await githubRepository.createBranchFromBase('packmind/sync');
      });

      it('does not POST a new ref', () => {
        expect(mockAxiosInstance.post).not.toHaveBeenCalled();
      });
    });

    describe('when the target branch is missing', () => {
      beforeEach(async () => {
        mockAxiosInstance.get = jest.fn().mockImplementation((url) => {
          if (
            url ===
            `/repos/${options.owner}/${options.repo}/git/refs/heads/packmind/sync`
          ) {
            return Promise.reject({ response: { status: 404 } });
          }
          if (
            url ===
            `/repos/${options.owner}/${options.repo}/git/refs/heads/main`
          ) {
            return Promise.resolve({
              data: { object: { sha: baseBranchSha } },
            });
          }
          return Promise.reject(new Error(`Unexpected GET: ${url}`));
        });
        mockAxiosInstance.post = jest.fn().mockResolvedValue({ data: {} });

        await githubRepository.createBranchFromBase('packmind/sync');
      });

      it('creates the target branch from the base SHA', () => {
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/refs`,
          {
            ref: 'refs/heads/packmind/sync',
            sha: baseBranchSha,
          },
        );
      });
    });

    describe('when fetching the base branch ref fails', () => {
      beforeEach(() => {
        mockAxiosInstance.get = jest.fn().mockImplementation((url) => {
          if (
            url ===
            `/repos/${options.owner}/${options.repo}/git/refs/heads/packmind/sync`
          ) {
            return Promise.reject({ response: { status: 404 } });
          }
          if (
            url ===
            `/repos/${options.owner}/${options.repo}/git/refs/heads/main`
          ) {
            return Promise.reject(new Error('Network down'));
          }
          return Promise.reject(new Error(`Unexpected GET: ${url}`));
        });
        mockAxiosInstance.post = jest.fn();
      });

      it('propagates an error mentioning the base branch', async () => {
        await expect(
          githubRepository.createBranchFromBase('packmind/sync'),
        ).rejects.toThrow(
          `Failed to fetch base branch 'main' on GitHub: Network down`,
        );
      });
    });
  });

  describe('openOrUpdatePullRequest', () => {
    const command = {
      head: 'packmind/sync',
      title: 'Packmind sync',
      body: 'rolling PR body',
    };

    describe('when an open pull request already exists', () => {
      let result: { url: string; number: number; wasCreated: boolean };

      beforeEach(async () => {
        mockAxiosInstance.get = jest.fn().mockResolvedValue({
          data: [
            {
              number: 12,
              html_url: 'https://github.com/test-owner/test-repo/pull/12',
            },
          ],
        });
        mockAxiosInstance.post = jest.fn();

        result = await githubRepository.openOrUpdatePullRequest(command);
      });

      it('returns the existing pull request URL', () => {
        expect(result.url).toBe(
          'https://github.com/test-owner/test-repo/pull/12',
        );
      });

      it('does not POST a new pull request', () => {
        expect(mockAxiosInstance.post).not.toHaveBeenCalled();
      });
    });

    describe('when no open pull request exists', () => {
      let result: { url: string; number: number; wasCreated: boolean };

      beforeEach(async () => {
        mockAxiosInstance.get = jest.fn().mockResolvedValue({ data: [] });
        mockAxiosInstance.post = jest.fn().mockResolvedValue({
          data: {
            number: 21,
            html_url: 'https://github.com/test-owner/test-repo/pull/21',
          },
        });

        result = await githubRepository.openOrUpdatePullRequest(command);
      });

      it('POSTs a new pull request with the expected payload', () => {
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/pulls`,
          {
            title: 'Packmind sync',
            head: 'packmind/sync',
            base: 'main',
            body: 'rolling PR body',
          },
        );
      });

      it('reports wasCreated=true', () => {
        expect(result.wasCreated).toBe(true);
      });
    });

    describe('when GitHub responds 422 "pull request already exists" on create', () => {
      let result: { url: string; number: number; wasCreated: boolean };

      beforeEach(async () => {
        const lookupResponses: Array<{ data: unknown[] }> = [
          { data: [] },
          {
            data: [
              {
                number: 99,
                html_url: 'https://github.com/test-owner/test-repo/pull/99',
              },
            ],
          },
        ];
        mockAxiosInstance.get = jest
          .fn()
          .mockImplementation(() =>
            Promise.resolve(lookupResponses.shift() ?? { data: [] }),
          );
        mockAxiosInstance.post = jest.fn().mockRejectedValue({
          response: {
            status: 422,
            data: { message: 'A pull request already exists for foo:bar' },
          },
        });

        result = await githubRepository.openOrUpdatePullRequest(command);
      });

      it('falls back to the existing pull request', () => {
        expect(result.url).toBe(
          'https://github.com/test-owner/test-repo/pull/99',
        );
      });
    });

    describe('when GitHub responds with a non-422 error on create', () => {
      beforeEach(() => {
        mockAxiosInstance.get = jest.fn().mockResolvedValue({ data: [] });
        mockAxiosInstance.post = jest.fn().mockRejectedValue({
          response: { status: 500, data: { message: 'Server error' } },
          message: 'Server error',
        });
      });

      it('propagates the error', async () => {
        await expect(
          githubRepository.openOrUpdatePullRequest(command),
        ).rejects.toThrow(/Failed to open pull request on GitHub/);
      });
    });
  });

  describe('findOpenPullRequest', () => {
    describe('when an open pull request exists', () => {
      let result: Awaited<
        ReturnType<typeof githubRepository.findOpenPullRequest>
      >;

      beforeEach(async () => {
        mockAxiosInstance.get = jest.fn().mockResolvedValue({
          data: [
            {
              number: 7,
              html_url: 'https://github.com/test-owner/test-repo/pull/7',
            },
          ],
        });
        result = await githubRepository.findOpenPullRequest('packmind/sync');
      });

      it('returns the first open pull request mapped to url and number', () => {
        expect(result).toEqual({
          url: 'https://github.com/test-owner/test-repo/pull/7',
          number: 7,
        });
      });
    });

    describe('when no open pull request exists', () => {
      it('returns null', async () => {
        mockAxiosInstance.get = jest.fn().mockResolvedValue({ data: [] });
        const result =
          await githubRepository.findOpenPullRequest('packmind/sync');
        expect(result).toBeNull();
      });
    });
  });

  describe('checkRepositoryExists', () => {
    describe('when the repository endpoint returns 200', () => {
      it('reports the repository exists', async () => {
        mockAxiosInstance.get = jest.fn().mockResolvedValue({ data: {} });
        const result = await githubRepository.checkRepositoryExists();
        expect(result).toEqual({ exists: true });
      });
    });

    describe('when the repository endpoint returns 404', () => {
      it('classifies the failure as repo_not_found', async () => {
        mockAxiosInstance.get = jest
          .fn()
          .mockRejectedValue({ response: { status: 404 } });
        const result = await githubRepository.checkRepositoryExists();
        expect(result).toEqual({ exists: false, reason: 'repo_not_found' });
      });
    });

    describe('when the repository endpoint returns 401', () => {
      it('classifies the failure as auth_failed', async () => {
        mockAxiosInstance.get = jest
          .fn()
          .mockRejectedValue({ response: { status: 401 } });
        const result = await githubRepository.checkRepositoryExists();
        expect(result).toEqual({ exists: false, reason: 'auth_failed' });
      });
    });

    describe('when the repository endpoint returns 403', () => {
      it('classifies the failure as auth_failed', async () => {
        mockAxiosInstance.get = jest
          .fn()
          .mockRejectedValue({ response: { status: 403 } });
        const result = await githubRepository.checkRepositoryExists();
        expect(result).toEqual({ exists: false, reason: 'auth_failed' });
      });
    });

    describe('when the request fails with a network error', () => {
      it('classifies the failure as network_transient', async () => {
        mockAxiosInstance.get = jest
          .fn()
          .mockRejectedValue(new Error('socket hang up'));
        const result = await githubRepository.checkRepositoryExists();
        expect(result).toEqual({ exists: false, reason: 'network_transient' });
      });
    });
  });

  describe('getFileOnRepo', () => {
    const filePath = 'test/file.txt';
    const fileSha = 'test-sha-123';
    const fileContent = 'test file content';
    const base64Content = Buffer.from(fileContent).toString('base64');

    describe('when file exists', () => {
      let result: Awaited<ReturnType<typeof githubRepository.getFileOnRepo>>;

      beforeEach(async () => {
        mockAxiosInstance.get = jest.fn().mockResolvedValue({
          data: {
            sha: fileSha,
            content: base64Content,
            encoding: 'base64',
          },
        });
        result = await githubRepository.getFileOnRepo(filePath);
      });

      it('returns the file data with sha and content', () => {
        expect(result).toEqual({
          sha: fileSha,
          content: base64Content,
        });
      });

      it('calls the API with the correct path and default branch', () => {
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/contents/${filePath}`,
          { params: { ref: 'main' } },
        );
      });

      describe('when custom branch is provided', () => {
        const customBranch = 'feature-branch';
        let customBranchResult: Awaited<
          ReturnType<typeof githubRepository.getFileOnRepo>
        >;

        beforeEach(async () => {
          customBranchResult = await githubRepository.getFileOnRepo(
            filePath,
            customBranch,
          );
        });

        it('returns the file data', () => {
          expect(customBranchResult).toEqual({
            sha: fileSha,
            content: base64Content,
          });
        });

        it('calls the API with the custom branch', () => {
          expect(mockAxiosInstance.get).toHaveBeenCalledWith(
            `/repos/${options.owner}/${options.repo}/contents/${filePath}`,
            { params: { ref: customBranch } },
          );
        });
      });
    });

    describe('when file does not exist', () => {
      let result: Awaited<ReturnType<typeof githubRepository.getFileOnRepo>>;

      beforeEach(async () => {
        mockAxiosInstance.get = jest.fn().mockRejectedValue({
          response: { status: 404 },
        });
        result = await githubRepository.getFileOnRepo(filePath);
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });

      it('calls the API with the correct path', () => {
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/contents/${filePath}`,
          { params: { ref: 'main' } },
        );
      });
    });

    describe('when API request fails with non-404 error', () => {
      beforeEach(() => {
        mockAxiosInstance.get = jest
          .fn()
          .mockRejectedValue(new Error('Server Error'));
      });

      it('throws the error', async () => {
        await expect(githubRepository.getFileOnRepo(filePath)).rejects.toThrow(
          'Server Error',
        );
      });
    });

    describe('when response has no sha', () => {
      beforeEach(() => {
        mockAxiosInstance.get = jest.fn().mockResolvedValue({
          data: {
            content: fileContent,
            // no sha property
          },
        });
      });

      describe('when response has no sha', () => {
        it('returns null', async () => {
          const result = await githubRepository.getFileOnRepo(filePath);

          expect(result).toBeNull();
        });
      });
    });
  });
});
