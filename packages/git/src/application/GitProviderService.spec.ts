import { GitProviderService } from './GitProviderService';
import { IGitProviderRepository } from '../domain/repositories/IGitProviderRepository';
import { IGitProviderFactory } from '../domain/repositories/IGitProviderFactory';
import { IGitRepoFactory } from '../domain/repositories/IGitRepoFactory';
import { IGitProvider } from '../domain/repositories/IGitProvider';
import {
  GitProvider,
  GitProviderVendor,
  GitProviderVendors,
  createGitProviderId,
} from '@packmind/types';
import { createOrganizationId } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { gitProviderFactory, gitlabProviderFactory } from '../../test';

describe('GitProviderService', () => {
  let gitProviderService: GitProviderService;
  let mockGitProviderRepository: jest.Mocked<IGitProviderRepository>;
  let mockGitProviderFactory: jest.Mocked<IGitProviderFactory>;
  let mockGitRepoFactory: jest.Mocked<IGitRepoFactory>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let mockGithubProviderInstance: jest.Mocked<IGitProvider>;
  let mockGitlabProviderInstance: jest.Mocked<IGitProvider>;

  const mockGitProvider: GitProvider = gitProviderFactory({
    id: createGitProviderId('provider-1'),
    source: GitProviderVendors.github,
    token: 'github-token',
    organizationId: createOrganizationId('org-1'),
    url: 'https://api.github.com',
  });

  const mockGitlabProvider: GitProvider = gitlabProviderFactory({
    id: createGitProviderId('provider-2'),
    source: GitProviderVendors.gitlab,
    token: 'gitlab-token',
    organizationId: createOrganizationId('org-1'),
    url: 'https://gitlab.com',
  });

  beforeEach(() => {
    mockGitProviderRepository = {
      findById: jest.fn(),
      add: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findByOrganizationId: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IGitProviderRepository>;

    stubbedLogger = stubLogger();

    mockGithubProviderInstance = {
      listAvailableRepositories: jest.fn(),
      checkBranchExists: jest.fn(),
    } as jest.Mocked<IGitProvider>;

    mockGitlabProviderInstance = {
      listAvailableRepositories: jest.fn(),
      checkBranchExists: jest.fn(),
    } as jest.Mocked<IGitProvider>;

    mockGitProviderFactory = {
      createGitProvider: jest.fn().mockImplementation((provider) => {
        if (provider.source === GitProviderVendors.github) {
          return mockGithubProviderInstance;
        }
        if (provider.source === GitProviderVendors.gitlab) {
          return mockGitlabProviderInstance;
        }
        throw new Error(`Unsupported git provider source: ${provider.source}`);
      }),
    } as jest.Mocked<IGitProviderFactory>;

    mockGitRepoFactory = {
      createGitRepo: jest.fn(),
    } as jest.Mocked<IGitRepoFactory>;

    gitProviderService = new GitProviderService(
      mockGitProviderRepository,
      mockGitProviderFactory,
      mockGitRepoFactory,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addGitProvider', () => {
    const gitProviderData = {
      source: GitProviderVendors.github,
      token: 'github-token',
      organizationId: createOrganizationId('org-1'),
      url: 'https://api.github.com',
    };
    let result: GitProvider;

    beforeEach(async () => {
      mockGitProviderRepository.add.mockResolvedValue(mockGitProvider);
      result = await gitProviderService.addGitProvider(gitProviderData);
    });

    it('calls repository with provider data including generated ID', () => {
      expect(mockGitProviderRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ...gitProviderData,
          id: expect.any(String),
        }),
      );
    });

    it('returns the added git provider', () => {
      expect(result).toEqual(mockGitProvider);
    });
  });

  describe('getAvailableRepos', () => {
    describe('when provider exists and has token', () => {
      const mockRepos = [
        {
          name: 'test-repo',
          owner: 'test-owner',
          description: 'Test repository',
          private: false,
          defaultBranch: 'main',
          language: 'TypeScript',
          stars: 42,
        },
      ];
      let result: typeof mockRepos;

      beforeEach(async () => {
        mockGitProviderRepository.findById.mockResolvedValue(mockGitProvider);
        mockGithubProviderInstance.listAvailableRepositories.mockResolvedValue(
          mockRepos,
        );
        result = await gitProviderService.getAvailableRepos(
          createGitProviderId('provider-1'),
        );
      });

      it('finds the provider by ID', () => {
        expect(mockGitProviderRepository.findById).toHaveBeenCalledWith(
          createGitProviderId('provider-1'),
        );
      });

      it('lists available repositories', () => {
        expect(
          mockGithubProviderInstance.listAvailableRepositories,
        ).toHaveBeenCalledWith();
      });

      it('returns the repositories', () => {
        expect(result).toEqual(mockRepos);
      });
    });

    describe('when GitLab provider exists and has token', () => {
      const mockRepos = [
        {
          name: 'gitlab-repo',
          owner: 'gitlab-owner',
          description: 'GitLab repository',
          private: true,
          defaultBranch: 'main',
          language: 'JavaScript',
          stars: 15,
        },
      ];
      let result: typeof mockRepos;

      beforeEach(async () => {
        mockGitProviderRepository.findById.mockResolvedValue(
          mockGitlabProvider,
        );
        mockGitlabProviderInstance.listAvailableRepositories.mockResolvedValue(
          mockRepos,
        );
        result = await gitProviderService.getAvailableRepos(
          createGitProviderId('provider-2'),
        );
      });

      it('finds the provider by ID', () => {
        expect(mockGitProviderRepository.findById).toHaveBeenCalledWith(
          createGitProviderId('provider-2'),
        );
      });

      it('creates the GitLab provider instance', () => {
        expect(mockGitProviderFactory.createGitProvider).toHaveBeenCalledWith(
          mockGitlabProvider,
        );
      });

      it('lists available repositories', () => {
        expect(
          mockGitlabProviderInstance.listAvailableRepositories,
        ).toHaveBeenCalledWith();
      });

      it('returns the repositories', () => {
        expect(result).toEqual(mockRepos);
      });
    });

    describe('when self-hosted GitLab provider exists and has token', () => {
      const selfHostedGitlabProvider = gitlabProviderFactory({
        id: createGitProviderId('provider-3'),
        source: GitProviderVendors.gitlab,
        token: 'gitlab-token',
        organizationId: createOrganizationId('org-1'),
        url: 'https://gitlab.company.com/api/v4',
      });

      const mockRepos = [
        {
          name: 'enterprise-repo',
          owner: 'enterprise-owner',
          description: 'Enterprise GitLab repository',
          private: true,
          defaultBranch: 'main',
          language: 'TypeScript',
          stars: 8,
        },
      ];
      let result: typeof mockRepos;

      beforeEach(async () => {
        mockGitProviderRepository.findById.mockResolvedValue(
          selfHostedGitlabProvider,
        );
        mockGitlabProviderInstance.listAvailableRepositories.mockResolvedValue(
          mockRepos,
        );
        result = await gitProviderService.getAvailableRepos(
          createGitProviderId('provider-3'),
        );
      });

      it('finds the provider by ID', () => {
        expect(mockGitProviderRepository.findById).toHaveBeenCalledWith(
          createGitProviderId('provider-3'),
        );
      });

      it('creates the GitLab provider with custom URL', () => {
        expect(mockGitProviderFactory.createGitProvider).toHaveBeenCalledWith(
          expect.objectContaining({
            source: GitProviderVendors.gitlab,
            token: 'gitlab-token',
            url: 'https://gitlab.company.com/api/v4',
          }),
        );
      });

      it('lists available repositories', () => {
        expect(
          mockGitlabProviderInstance.listAvailableRepositories,
        ).toHaveBeenCalledWith();
      });

      it('returns the repositories', () => {
        expect(result).toEqual(mockRepos);
      });
    });

    describe('when git provider is not found', () => {
      it('throws error', async () => {
        mockGitProviderRepository.findById.mockResolvedValue(null);

        await expect(
          gitProviderService.getAvailableRepos(
            createGitProviderId('nonexistent-provider'),
          ),
        ).rejects.toThrow('Git provider not found');
      });
    });

    describe('when git provider has no token', () => {
      it('throws error', async () => {
        const providerWithoutToken = {
          ...mockGitProvider,
          token: null,
        };
        mockGitProviderRepository.findById.mockResolvedValue(
          providerWithoutToken,
        );

        await expect(
          gitProviderService.getAvailableRepos(
            createGitProviderId('provider-1'),
          ),
        ).rejects.toThrow('Git provider token not configured');
      });
    });

    describe('when git provider type is unsupported', () => {
      it('throws error', async () => {
        const unsupportedProvider = {
          ...mockGitProvider,
          source: 'UNSUPPORTED' as GitProviderVendor,
        };
        mockGitProviderRepository.findById.mockResolvedValue(
          unsupportedProvider,
        );

        await expect(
          gitProviderService.getAvailableRepos(
            createGitProviderId('provider-1'),
          ),
        ).rejects.toThrow('Unsupported git provider source: UNSUPPORTED');
      });
    });
  });

  describe('updateGitProvider', () => {
    const updateData = {
      token: 'new-token',
      url: 'https://github.enterprise.com',
    };
    const updatedProvider = {
      ...mockGitProvider,
      ...updateData,
    };
    let result: GitProvider;

    beforeEach(async () => {
      mockGitProviderRepository.update.mockResolvedValue(updatedProvider);
      result = await gitProviderService.updateGitProvider(
        createGitProviderId('provider-1'),
        updateData,
      );
    });

    it('calls repository update with correct parameters', () => {
      expect(mockGitProviderRepository.update).toHaveBeenCalledWith(
        createGitProviderId('provider-1'),
        updateData,
      );
    });

    it('returns the updated provider', () => {
      expect(result).toEqual(updatedProvider);
    });

    describe('when update fails', () => {
      it('propagates repository errors', async () => {
        const updateDataForError = { token: 'new-token' };
        const repositoryError = new Error('Provider not found');

        mockGitProviderRepository.update.mockRejectedValue(repositoryError);

        await expect(
          gitProviderService.updateGitProvider(
            createGitProviderId('nonexistent-provider'),
            updateDataForError,
          ),
        ).rejects.toThrow('Provider not found');
      });
    });
  });

  describe('checkBranchExists', () => {
    const owner = 'test-owner';
    const repo = 'test-repo';
    const branch = 'feature/test';

    describe('when branch exists', () => {
      let result: boolean;

      beforeEach(async () => {
        mockGitProviderRepository.findById.mockResolvedValue(mockGitProvider);
        mockGithubProviderInstance.checkBranchExists.mockResolvedValue(true);
        result = await gitProviderService.checkBranchExists(
          createGitProviderId('provider-1'),
          owner,
          repo,
          branch,
        );
      });

      it('finds the provider by ID', () => {
        expect(mockGitProviderRepository.findById).toHaveBeenCalledWith(
          createGitProviderId('provider-1'),
        );
      });

      it('creates the GitHub provider instance', () => {
        expect(mockGitProviderFactory.createGitProvider).toHaveBeenCalledWith(
          mockGitProvider,
        );
      });

      it('checks if branch exists', () => {
        expect(
          mockGithubProviderInstance.checkBranchExists,
        ).toHaveBeenCalledWith(owner, repo, branch);
      });

      it('returns true', () => {
        expect(result).toBe(true);
      });
    });

    describe('when GitLab provider and branch exists', () => {
      let result: boolean;

      beforeEach(async () => {
        mockGitProviderRepository.findById.mockResolvedValue(
          mockGitlabProvider,
        );
        mockGitlabProviderInstance.checkBranchExists.mockResolvedValue(true);
        result = await gitProviderService.checkBranchExists(
          createGitProviderId('provider-2'),
          owner,
          repo,
          branch,
        );
      });

      it('finds the provider by ID', () => {
        expect(mockGitProviderRepository.findById).toHaveBeenCalledWith(
          createGitProviderId('provider-2'),
        );
      });

      it('creates the GitLab provider instance', () => {
        expect(mockGitProviderFactory.createGitProvider).toHaveBeenCalledWith(
          mockGitlabProvider,
        );
      });

      it('checks if branch exists', () => {
        expect(
          mockGitlabProviderInstance.checkBranchExists,
        ).toHaveBeenCalledWith(owner, repo, branch);
      });

      it('returns true', () => {
        expect(result).toBe(true);
      });
    });

    describe('when self-hosted GitLab provider and branch exists', () => {
      const selfHostedGitlabProvider = gitlabProviderFactory({
        id: createGitProviderId('provider-3'),
        source: GitProviderVendors.gitlab,
        token: 'gitlab-token',
        organizationId: createOrganizationId('org-1'),
        url: 'https://gitlab.enterprise.com/api/v4',
      });
      let result: boolean;

      beforeEach(async () => {
        mockGitProviderRepository.findById.mockResolvedValue(
          selfHostedGitlabProvider,
        );
        mockGitlabProviderInstance.checkBranchExists.mockResolvedValue(true);
        result = await gitProviderService.checkBranchExists(
          createGitProviderId('provider-3'),
          owner,
          repo,
          branch,
        );
      });

      it('finds the provider by ID', () => {
        expect(mockGitProviderRepository.findById).toHaveBeenCalledWith(
          createGitProviderId('provider-3'),
        );
      });

      it('creates the GitLab provider with custom URL', () => {
        expect(mockGitProviderFactory.createGitProvider).toHaveBeenCalledWith(
          expect.objectContaining({
            source: GitProviderVendors.gitlab,
            token: 'gitlab-token',
            url: 'https://gitlab.enterprise.com/api/v4',
          }),
        );
      });

      it('checks if branch exists', () => {
        expect(
          mockGitlabProviderInstance.checkBranchExists,
        ).toHaveBeenCalledWith(owner, repo, branch);
      });

      it('returns true', () => {
        expect(result).toBe(true);
      });
    });

    describe('when branch does not exist', () => {
      let result: boolean;

      beforeEach(async () => {
        mockGitProviderRepository.findById.mockResolvedValue(mockGitProvider);
        mockGithubProviderInstance.checkBranchExists.mockResolvedValue(false);
        result = await gitProviderService.checkBranchExists(
          createGitProviderId('provider-1'),
          owner,
          repo,
          branch,
        );
      });

      it('checks if branch exists', () => {
        expect(
          mockGithubProviderInstance.checkBranchExists,
        ).toHaveBeenCalledWith(owner, repo, branch);
      });

      it('returns false', () => {
        expect(result).toBe(false);
      });
    });

    describe('when git provider is not found', () => {
      it('throws error', async () => {
        mockGitProviderRepository.findById.mockResolvedValue(null);

        await expect(
          gitProviderService.checkBranchExists(
            createGitProviderId('nonexistent-provider'),
            owner,
            repo,
            branch,
          ),
        ).rejects.toThrow('Git provider not found');
      });
    });

    describe('when git provider has no token', () => {
      it('throws error', async () => {
        const providerWithoutToken = {
          ...mockGitProvider,
          token: null,
        };
        mockGitProviderRepository.findById.mockResolvedValue(
          providerWithoutToken,
        );

        await expect(
          gitProviderService.checkBranchExists(
            createGitProviderId('provider-1'),
            owner,
            repo,
            branch,
          ),
        ).rejects.toThrow('Git provider token not configured');
      });
    });

    describe('when git provider type is unsupported', () => {
      it('throws error', async () => {
        const unsupportedProvider = {
          ...mockGitProvider,
          source: 'UNSUPPORTED' as GitProviderVendor,
        };
        mockGitProviderRepository.findById.mockResolvedValue(
          unsupportedProvider,
        );

        await expect(
          gitProviderService.checkBranchExists(
            createGitProviderId('provider-1'),
            owner,
            repo,
            branch,
          ),
        ).rejects.toThrow('Unsupported git provider source: UNSUPPORTED');
      });
    });

    describe('when GitHub provider throws error', () => {
      it('propagates the error', async () => {
        const githubError = new Error('GitHub API error');
        mockGitProviderRepository.findById.mockResolvedValue(mockGitProvider);
        mockGithubProviderInstance.checkBranchExists.mockRejectedValue(
          githubError,
        );

        await expect(
          gitProviderService.checkBranchExists(
            createGitProviderId('provider-1'),
            owner,
            repo,
            branch,
          ),
        ).rejects.toThrow('GitHub API error');
      });
    });

    describe('when GitLab provider throws error', () => {
      it('propagates the error', async () => {
        const gitlabError = new Error('GitLab API error');
        mockGitProviderRepository.findById.mockResolvedValue(
          mockGitlabProvider,
        );
        mockGitlabProviderInstance.checkBranchExists.mockRejectedValue(
          gitlabError,
        );

        await expect(
          gitProviderService.checkBranchExists(
            createGitProviderId('provider-2'),
            owner,
            repo,
            branch,
          ),
        ).rejects.toThrow('GitLab API error');
      });
    });
  });
});
