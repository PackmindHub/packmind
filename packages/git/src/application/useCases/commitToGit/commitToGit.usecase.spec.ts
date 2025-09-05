import { CommitToGit } from './commitToGit.usecase';
import { GitCommitService } from '../../services/GitCommitService';
import { GitProviderService } from '../../GitProviderService';
import { createGitRepoId, GitRepo } from '../../../domain/entities/GitRepo';
import {
  createGitProviderId,
  GitProvider,
  GitProviderVendor,
  GitProviderVendors,
} from '../../../domain/entities/GitProvider';
import { IGitRepo } from '../../../domain/repositories/IGitRepo';
import { gitCommitFactory } from '../../../../test/gitCommitFactory';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { createOrganizationId } from '@packmind/accounts';
import { GithubRepository } from '../../../infra/repositories/github/GithubRepository';

// Mock the GithubRepository
jest.mock('../../../infra/repositories/github/GithubRepository');

const MockedGithubRepository = GithubRepository as jest.MockedClass<
  typeof GithubRepository
>;

describe('CommitToGit', () => {
  let commitToGit: CommitToGit;
  let mockGitCommitService: jest.Mocked<GitCommitService>;
  let mockGitProviderService: jest.Mocked<GitProviderService>;
  let mockLogger: jest.Mocked<PackmindLogger>;
  let mockGithubRepository: jest.Mocked<IGitRepo>;

  beforeEach(() => {
    mockGitCommitService = {
      addCommit: jest.fn(),
      getCommit: jest.fn(),
    } as unknown as jest.Mocked<GitCommitService>;

    mockGitProviderService = {
      findGitProviderById: jest.fn(),
      addGitProvider: jest.fn(),
      findGitProvidersByOrganizationId: jest.fn(),
      updateGitProvider: jest.fn(),
      deleteGitProvider: jest.fn(),
      getAvailableRepos: jest.fn(),
      checkBranchExists: jest.fn(),
    } as unknown as jest.Mocked<GitProviderService>;

    mockLogger = stubLogger();

    mockGithubRepository = {
      commitFiles: jest.fn(),
      handlePushHook: jest.fn(),
      getFileOnRepo: jest.fn(),
    } as jest.Mocked<IGitRepo>;

    MockedGithubRepository.mockImplementation(
      () => mockGithubRepository as unknown as GithubRepository,
    );

    commitToGit = new CommitToGit(
      mockGitCommitService,
      mockGitProviderService,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('commitToGit', () => {
    const mockGitProvider: GitProvider = {
      id: createGitProviderId('provider-id'),
      source: GitProviderVendors.github,
      organizationId: createOrganizationId('org-id'),
      url: null,
      token: 'github-token',
    };

    const mockGitRepo: GitRepo = {
      id: createGitRepoId('repo-id'),
      owner: 'test-owner',
      repo: 'test-repo',
      branch: 'main',
      providerId: createGitProviderId('provider-id'),
    };

    it('successfully commits multiple files to git and stores commit', async () => {
      const files = [
        { path: 'test/file1.txt', content: 'test content 1' },
        { path: 'test/file2.txt', content: 'test content 2' },
      ];

      const commitDataFromGit = {
        sha: 'abc123',
        message: 'Add multiple files',
        author: 'test@example.com',
        url: 'https://github.com/test-owner/test-repo/commit/abc123',
      };

      const expectedCommit = gitCommitFactory(commitDataFromGit);

      // Mock provider service to return the provider
      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockGitProvider,
      );

      // Mock commitFiles to return actual commit data from git operation
      mockGithubRepository.commitFiles.mockResolvedValue(commitDataFromGit);
      mockGitCommitService.addCommit.mockResolvedValue(expectedCommit);

      const result = await commitToGit.commitToGit(
        mockGitRepo,
        files,
        'Commit message',
      );

      expect(MockedGithubRepository).toHaveBeenCalledWith(
        'github-token',
        {
          owner: 'test-owner',
          repo: 'test-repo',
          branch: 'main',
        },
        mockLogger,
      );

      expect(mockGithubRepository.commitFiles).toHaveBeenCalledWith(
        files,
        'Commit message',
      );
      expect(mockGitCommitService.addCommit).toHaveBeenCalledWith(
        commitDataFromGit,
      );
      expect(result).toEqual(expectedCommit);
    });

    it('throws error for unsupported git provider', async () => {
      const unsupportedProvider: GitProvider = {
        ...mockGitProvider,
        source: 'UNSUPPORTED' as GitProviderVendor,
      };

      // Mock provider service to return the unsupported provider
      mockGitProviderService.findGitProviderById.mockResolvedValue(
        unsupportedProvider,
      );

      await expect(
        commitToGit.commitToGit(
          mockGitRepo,
          [{ path: 'test.txt', content: 'content' }],
          'Commit message',
        ),
      ).rejects.toThrow('Unsupported git provider source: UNSUPPORTED');
    });

    it('throws error if provider token is missing', async () => {
      const providerWithoutToken: GitProvider = {
        ...mockGitProvider,
        token: null,
      };

      // Mock provider service to return the provider without token
      mockGitProviderService.findGitProviderById.mockResolvedValue(
        providerWithoutToken,
      );

      await expect(
        commitToGit.commitToGit(
          mockGitRepo,
          [{ path: 'test.txt', content: 'content' }],
          'Commit message',
        ),
      ).rejects.toThrow('Git provider token not configured');
    });

    it('throws error if provider is not found', async () => {
      // Mock provider service to return null (provider not found)
      mockGitProviderService.findGitProviderById.mockResolvedValue(null);

      await expect(
        commitToGit.commitToGit(
          mockGitRepo,
          [{ path: 'test.txt', content: 'content' }],
          'Commit message',
        ),
      ).rejects.toThrow('Git provider not found');
    });

    it('throws error if files array is empty', async () => {
      // Mock provider service to return the provider
      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockGitProvider,
      );

      await expect(
        commitToGit.commitToGit(mockGitRepo, [], ''),
      ).rejects.toThrow('No files to commit');
    });
  });
});
