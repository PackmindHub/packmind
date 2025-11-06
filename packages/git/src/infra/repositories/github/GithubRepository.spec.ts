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
      beforeEach(() => {
        // Mock getFileOnRepo to return null (files don't exist)
        jest.spyOn(githubRepository, 'getFileOnRepo').mockResolvedValue(null);
      });

      it('creates new files with correct parameters and returns commit data', async () => {
        const result = await githubRepository.commitFiles(
          files,
          'Commit message',
        );

        // Verify API calls
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/refs/heads/main`,
        );

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/commits/${refSha}`,
        );

        files.forEach((file) => {
          expect(githubRepository.getFileOnRepo).toHaveBeenCalledWith(
            file.path,
            'main',
          );
        });

        // Verify tree creation
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

        // Verify commit creation
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/commits`,
          {
            message: 'Commit message',
            tree: newTreeSha,
            parents: [refSha],
          },
        );

        // Verify reference update
        expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/refs/heads/main`,
          {
            sha: newCommitSha,
            force: false,
          },
        );

        // Verify returned commit data
        expect(result).toEqual({
          sha: newCommitSha,
          message: 'Commit message',
          author: 'test@example.com',
          url: `https://github.com/${options.owner}/${options.repo}/commit/${newCommitSha}`,
        });
      });
    });

    describe('when some files already exist', () => {
      beforeEach(() => {
        // Mock getFileOnRepo to return a file for the first file and null for the second
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
      });

      it('updates existing files and creates new ones in a single commit', async () => {
        const result = await githubRepository.commitFiles(
          files,
          'Commit message',
        );

        // Verify commit was created with the passed message
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/commits`,
          {
            message: 'Commit message',
            tree: newTreeSha,
            parents: [refSha],
          },
        );

        // Verify returned commit data
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

      beforeEach(() => {
        stubbedLogger = stubLogger();
        githubRepository = new GithubRepository(
          githubToken,
          {
            ...options,
            branch: customBranch,
          },
          stubbedLogger,
        );

        // Mock getFileOnRepo to return null (files don't exist)
        jest.spyOn(githubRepository, 'getFileOnRepo').mockResolvedValue(null);
      });

      it('uses the specified branch for all operations', async () => {
        const result = await githubRepository.commitFiles(
          files,
          'Commit message',
        );

        // Verify branch is used in API calls
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/refs/heads/${customBranch}`,
        );

        // Verify getFileOnRepo was called with the custom branch
        files.forEach((file) => {
          expect(githubRepository.getFileOnRepo).toHaveBeenCalledWith(
            file.path,
            customBranch,
          );
        });

        // Verify reference update uses custom branch
        expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/git/refs/heads/${customBranch}`,
          {
            sha: newCommitSha,
            force: false,
          },
        );

        // Verify returned commit data
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

    describe('when x-github-event header is undefined', () => {
      it('returns false', () => {
        const headers = { 'x-github-event': undefined };
        const result = githubRepository.isPushEventFromWebhook(headers);
        expect(result).toBe(false);
      });
    });

    describe('when x-github-event header is null', () => {
      it('returns false', () => {
        const headers = { 'x-github-event': null };
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
      beforeEach(() => {
        mockAxiosInstance.get = jest.fn().mockResolvedValue({
          data: {
            sha: fileSha,
            content: base64Content,
            encoding: 'base64',
          },
        });
      });

      it('returns file data with sha and base64 content', async () => {
        const result = await githubRepository.getFileOnRepo(filePath);

        expect(result).toEqual({
          sha: fileSha,
          content: base64Content,
        });

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          `/repos/${options.owner}/${options.repo}/contents/${filePath}`,
          { params: { ref: 'main' } },
        );
      });

      describe('when custom branch is provided', () => {
        it('uses the custom branch', async () => {
          const customBranch = 'feature-branch';
          const result = await githubRepository.getFileOnRepo(
            filePath,
            customBranch,
          );

          expect(result).toEqual({
            sha: fileSha,
            content: base64Content,
          });

          expect(mockAxiosInstance.get).toHaveBeenCalledWith(
            `/repos/${options.owner}/${options.repo}/contents/${filePath}`,
            { params: { ref: customBranch } },
          );
        });
      });
    });

    describe('when file does not exist', () => {
      beforeEach(() => {
        mockAxiosInstance.get = jest.fn().mockRejectedValue({
          response: { status: 404 },
        });
      });

      describe('when file is not found', () => {
        it('returns null', async () => {
          const result = await githubRepository.getFileOnRepo(filePath);

          expect(result).toBeNull();

          expect(mockAxiosInstance.get).toHaveBeenCalledWith(
            `/repos/${options.owner}/${options.repo}/contents/${filePath}`,
            { params: { ref: 'main' } },
          );
        });
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

    it('returns matching files with their content', async () => {
      const result = await githubRepository.handlePushHook(
        pushPayload,
        fileMatcher,
      );

      expect(result).toHaveLength(2);
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

      // Verify API calls were made correctly
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/repos/${options.owner}/${options.repo}/contents/file2.txt`,
        { params: { ref: 'commit1' } },
      );
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/repos/${options.owner}/${options.repo}/contents/file5.txt`,
        { params: { ref: 'commit2' } },
      );
    });

    describe('when no files match the pattern', () => {
      it('returns an empty array', async () => {
        const noMatchMatcher = /\.nonexistent$/;
        const result = await githubRepository.handlePushHook(
          pushPayload,
          noMatchMatcher,
        );

        expect(result).toHaveLength(0);
        expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      });
    });

    it('handles API errors gracefully', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API Error'));

      await expect(
        githubRepository.handlePushHook(pushPayload, fileMatcher),
      ).rejects.toThrow('Failed to process GitHub webhook: API Error');
    });

    it('handles payload without commits array gracefully', async () => {
      const invalidPayload = { invalid: 'payload' };

      const result = await githubRepository.handlePushHook(
        invalidPayload,
        fileMatcher,
      );

      expect(result).toEqual([]);
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('handles payload with empty commits array', async () => {
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

      const result = await githubRepository.handlePushHook(
        emptyCommitsPayload,
        fileMatcher,
      );

      expect(result).toEqual([]);
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('returns empty array for non-main branch webhook', async () => {
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

      const result = await githubRepository.handlePushHook(
        nonMainBranchPayload,
        fileMatcher,
      );

      expect(result).toEqual([]);
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('skips webhook for develop branch', async () => {
      const nonMainBranchPayload = {
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

      const result = await githubRepository.handlePushHook(
        nonMainBranchPayload,
        fileMatcher,
      );

      expect(result).toEqual([]);
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
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
