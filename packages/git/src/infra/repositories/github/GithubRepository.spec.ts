import axios from 'axios';
import { GithubRepository, GithubRepositoryOptions } from './GithubRepository';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GithubRepository', () => {
  let githubRepository: GithubRepository;
  let mockAxiosInstance: jest.Mocked<typeof axios>;
  const githubToken = 'test-github-token';
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const options: GithubRepositoryOptions = {
    owner: 'test-owner',
    repo: 'test-repo',
  };

  // Sample GitHub webhook push payload
  const pushPayload = {
    ref: 'refs/heads/main',
    repository: {
      name: 'test-repo',
      owner: {
        name: 'test-owner',
      },
    },
    commits: [
      {
        id: 'commit1',
        added: ['file1.txt'],
        modified: ['file2.txt', 'file3.md'],
        removed: ['file4.js'],
        author: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
      {
        id: 'commit2',
        added: [],
        modified: ['file5.txt', 'file6.md'],
        removed: [],
        author: {
          name: 'Jane Smith',
          email: 'jane@example.com',
        },
      },
    ],
  };

  beforeEach(() => {
    mockAxiosInstance = {} as jest.Mocked<typeof axios>;
    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    stubbedLogger = stubLogger();
    githubRepository = new GithubRepository(
      githubToken,
      options,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('creates an axios instance with the correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.github.com',
        headers: {
          Authorization: `token ${githubToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
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
      { path: 'test/file-to-delete.txt', type: 'blob', sha: 'existing-sha-1' },
      {
        path: 'test/another-file-to-delete.txt',
        type: 'blob',
        sha: 'existing-sha-2',
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
          githubToken,
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
  });

  describe('isValidBranch', () => {
    it('returns true for main branch', () => {
      const result = githubRepository.isValidBranch('refs/heads/main');
      expect(result).toBe(true);
    });

    it('returns false for non-main branch', () => {
      const result = githubRepository.isValidBranch(
        'refs/heads/feature-branch',
      );
      expect(result).toBe(false);
    });

    it('returns false for develop branch', () => {
      const result = githubRepository.isValidBranch('refs/heads/develop');
      expect(result).toBe(false);
    });
  });

  describe('isPushEventFromWebhook', () => {
    it('returns true for push events', () => {
      const headers = { 'x-github-event': 'push' };
      const result = githubRepository.isPushEventFromWebhook(headers);
      expect(result).toBe(true);
    });

    it('returns false for pull_request events', () => {
      const headers = { 'x-github-event': 'pull_request' };
      const result = githubRepository.isPushEventFromWebhook(headers);
      expect(result).toBe(false);
    });

    it('returns false for issues events', () => {
      const headers = { 'x-github-event': 'issues' };
      const result = githubRepository.isPushEventFromWebhook(headers);
      expect(result).toBe(false);
    });

    it('returns false for repository events', () => {
      const headers = { 'x-github-event': 'repository' };
      const result = githubRepository.isPushEventFromWebhook(headers);
      expect(result).toBe(false);
    });

    it('returns false for release events', () => {
      const headers = { 'x-github-event': 'release' };
      const result = githubRepository.isPushEventFromWebhook(headers);
      expect(result).toBe(false);
    });

    describe('when x-github-event header is missing', () => {
      it('returns false', () => {
        const headers = {};
        const result = githubRepository.isPushEventFromWebhook(headers);
        expect(result).toBe(false);
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

  describe('handlePushHook', () => {
    const fileMatcher = /\.txt$/; // Match files ending with .txt
    const fileContent1 = 'content of file2.txt';
    const fileContent2 = 'content of file5.txt';

    beforeEach(() => {
      // Mock the get method for fetching file content
      mockAxiosInstance.get = jest.fn().mockImplementation((url) => {
        if (url.includes('file2.txt')) {
          return Promise.resolve({
            data: {
              content: Buffer.from(fileContent1).toString('base64'),
              encoding: 'base64',
            },
          });
        } else if (url.includes('file5.txt')) {
          return Promise.resolve({
            data: {
              content: Buffer.from(fileContent2).toString('base64'),
              encoding: 'base64',
            },
          });
        }
        return Promise.reject(new Error(`File not found: ${url}`));
      });
    });

    describe('when processing a valid push payload', () => {
      let result: Awaited<ReturnType<typeof githubRepository.handlePushHook>>;

      beforeEach(async () => {
        result = await githubRepository.handlePushHook(
          pushPayload,
          fileMatcher,
        );
      });

      it('returns matching files with their content', () => {
        expect(result).toEqual(
          expect.arrayContaining([
            {
              filepath: 'file2.txt',
              fileContent: fileContent1,
              author: 'John Doe',
              gitSha: 'commit1',
              gitRepo: 'https://github.com/test-owner/test-repo',
              message: null,
            },
            {
              filepath: 'file5.txt',
              fileContent: fileContent2,
              author: 'Jane Smith',
              gitSha: 'commit2',
              gitRepo: 'https://github.com/test-owner/test-repo',
              message: null,
            },
          ]),
        );
      });

      it('fetches the content for file2.txt', () => {
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/contents/file2.txt`,
          { params: { ref: 'commit1' } },
        );
      });

      it('fetches the content for file5.txt', () => {
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/contents/file5.txt`,
          { params: { ref: 'commit2' } },
        );
      });
    });

    describe('when no files match the pattern', () => {
      const noMatchMatcher = /\.nonexistent$/;
      let result: Awaited<ReturnType<typeof githubRepository.handlePushHook>>;

      beforeEach(async () => {
        result = await githubRepository.handlePushHook(
          pushPayload,
          noMatchMatcher,
        );
      });

      it('returns an empty array', () => {
        expect(result).toHaveLength(0);
      });

      it('does not call the API', () => {
        expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      });
    });

    it('handles API errors gracefully', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API Error'));

      await expect(
        githubRepository.handlePushHook(pushPayload, fileMatcher),
      ).rejects.toThrow('Failed to process GitHub webhook: API Error');
    });

    describe('when payload has no commits array', () => {
      const invalidPayload = { invalid: 'payload' };
      let result: Awaited<ReturnType<typeof githubRepository.handlePushHook>>;

      beforeEach(async () => {
        result = await githubRepository.handlePushHook(
          invalidPayload,
          fileMatcher,
        );
      });

      it('returns an empty array', () => {
        expect(result).toEqual([]);
      });

      it('does not call the API', () => {
        expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      });
    });

    describe('when payload has empty commits array', () => {
      const emptyCommitsPayload = {
        ref: 'refs/heads/main',
        repository: {
          name: 'test-repo',
          owner: {
            name: 'test-owner',
          },
        },
        commits: [],
      };
      let result: Awaited<ReturnType<typeof githubRepository.handlePushHook>>;

      beforeEach(async () => {
        result = await githubRepository.handlePushHook(
          emptyCommitsPayload,
          fileMatcher,
        );
      });

      it('returns an empty array', () => {
        expect(result).toEqual([]);
      });

      it('does not call the API', () => {
        expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      });
    });

    describe('when webhook is for a non-main branch', () => {
      const nonMainBranchPayload = {
        ref: 'refs/heads/feature-branch',
        repository: {
          name: 'test-repo',
          owner: {
            name: 'test-owner',
          },
        },
        commits: [
          {
            id: 'commit1',
            added: ['file1.txt'],
            modified: ['file2.txt'],
            removed: [],
            author: {
              name: 'John Doe',
              email: 'john@example.com',
            },
          },
        ],
      };
      let result: Awaited<ReturnType<typeof githubRepository.handlePushHook>>;

      beforeEach(async () => {
        result = await githubRepository.handlePushHook(
          nonMainBranchPayload,
          fileMatcher,
        );
      });

      it('returns an empty array', () => {
        expect(result).toEqual([]);
      });

      it('does not call the API', () => {
        expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      });
    });

    describe('when webhook is for develop branch', () => {
      const developBranchPayload = {
        ref: 'refs/heads/develop',
        repository: {
          name: 'test-repo',
          owner: {
            name: 'test-owner',
          },
        },
        commits: [
          {
            id: 'commit1',
            added: ['file1.txt'],
            modified: ['file2.txt'],
            removed: [],
            author: {
              name: 'John Doe',
              email: 'john@example.com',
            },
          },
        ],
      };
      let result: Awaited<ReturnType<typeof githubRepository.handlePushHook>>;

      beforeEach(async () => {
        result = await githubRepository.handlePushHook(
          developBranchPayload,
          fileMatcher,
        );
      });

      it('returns an empty array', () => {
        expect(result).toEqual([]);
      });

      it('does not call the API', () => {
        expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      });
    });

    it('processes webhook for main branch normally', async () => {
      const mainBranchPayload = {
        ref: 'refs/heads/main',
        repository: {
          name: 'test-repo',
          owner: {
            name: 'test-owner',
          },
        },
        commits: [
          {
            id: 'commit1',
            added: [],
            modified: ['file2.txt'],
            removed: [],
            author: {
              name: 'John Doe',
              email: 'john@example.com',
            },
          },
        ],
      };

      const result = await githubRepository.handlePushHook(
        mainBranchPayload,
        fileMatcher,
      );

      expect(result).toEqual([
        {
          filepath: 'file2.txt',
          fileContent: fileContent1,
          author: 'John Doe',
          gitSha: 'commit1',
          gitRepo: 'https://github.com/test-owner/test-repo',
          message: null,
        },
      ]);
    });

    describe('when the same file is modified in multiple commits', () => {
      let result: {
        filepath: string;
        fileContent: string;
        author: string | null;
        gitSha: string | null;
        gitRepo: string | null;
        message: string | null;
      }[];
      const firstVersionContent = 'First version';
      const secondVersionContent = 'Second version';
      const sameFilePayload = {
        ref: 'refs/heads/main',
        repository: {
          name: 'test-repo',
          owner: {
            name: 'test-owner',
          },
        },
        commits: [
          {
            id: 'commit1',
            added: [],
            modified: ['.packmind/recipes/recipe.md'],
            removed: [],
            author: {
              name: 'First Author',
              email: 'first@example.com',
            },
          },
          {
            id: 'commit2',
            added: [],
            modified: ['.packmind/recipes/recipe.md'],
            removed: [],
            author: {
              name: 'Second Author',
              email: 'second@example.com',
            },
          },
        ],
      };

      beforeEach(async () => {
        // Mock the get method to return different content based on commit
        mockAxiosInstance.get = jest.fn().mockImplementation((url, config) => {
          if (url.includes('.packmind/recipes/recipe.md')) {
            if (config?.params?.ref === 'commit1') {
              return Promise.resolve({
                data: {
                  content: Buffer.from(firstVersionContent).toString('base64'),
                  encoding: 'base64',
                },
              });
            } else if (config?.params?.ref === 'commit2') {
              return Promise.resolve({
                data: {
                  content: Buffer.from(secondVersionContent).toString('base64'),
                  encoding: 'base64',
                },
              });
            }
          }
          return Promise.reject(new Error(`File not found: ${url}`));
        });

        const fileMatcher = /\.packmind\/recipes\/recipe\.md$/;
        result = await githubRepository.handlePushHook(
          sameFilePayload,
          fileMatcher,
        );
      });

      describe('when the same file is modified in multiple commits', () => {
        it('returns only the latest version', async () => {
          expect(result).toEqual([
            {
              filepath: '.packmind/recipes/recipe.md',
              fileContent: secondVersionContent,
              author: 'Second Author',
              gitSha: 'commit2',
              gitRepo: 'https://github.com/test-owner/test-repo',
              message: null,
            },
          ]);
        });
      });

      describe('when the same file is modified in multiple commits', () => {
        it('calls the API for the latest commit', async () => {
          expect(mockAxiosInstance.get).toHaveBeenCalledWith(
            `/repos/${options.owner}/${options.repo}/contents/.packmind/recipes/recipe.md`,
            { params: { ref: 'commit2' } },
          );
        });
      });

      describe('when the same file is modified multiple times', () => {
        it('does not call the API for the earlier commit', async () => {
          expect(mockAxiosInstance.get).not.toHaveBeenCalledWith(
            `/repos/${options.owner}/${options.repo}/contents/.packmind/recipes/recipe.md`,
            { params: { ref: 'commit1' } },
          );
        });
      });
    });
  });
});
