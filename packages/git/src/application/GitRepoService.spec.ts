import { GitRepoService } from './GitRepoService';
import { IGitRepoRepository } from '../domain/repositories/IGitRepoRepository';
import { createOrganizationId, createUserId } from '@packmind/types';
import { GitRepo, createGitRepoId, createGitProviderId } from '@packmind/types';
import { gitRepoFactory } from '../../test';

describe('GitRepoService', () => {
  let gitRepoService: GitRepoService;
  let mockGitRepoRepository: jest.Mocked<IGitRepoRepository>;

  const mockGitRepo: GitRepo = gitRepoFactory({
    id: createGitRepoId('repo-1'),
    owner: 'test-owner',
    repo: 'test-repo',
    branch: 'main',
    providerId: createGitProviderId('provider-1'),
    type: 'standard',
  });

  beforeEach(() => {
    mockGitRepoRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findByOwnerAndRepo: jest.fn(),
      findByOwnerAndRepoInOrganization: jest.fn(),
      findByProviderId: jest.fn(),
      findByOrganizationId: jest.fn(),
      list: jest.fn(),
      findByOwnerRepoAndBranchInOrganization: jest.fn(),
    } as unknown as jest.Mocked<IGitRepoRepository>;

    gitRepoService = new GitRepoService(mockGitRepoRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addGitRepo', () => {
    const newRepo: Omit<GitRepo, 'id'> = {
      owner: 'test-owner',
      repo: 'test-repo',
      branch: 'main',
      providerId: createGitProviderId('provider-1'),
      type: 'standard',
    };
    let result: GitRepo;

    beforeEach(async () => {
      mockGitRepoRepository.add.mockResolvedValue(mockGitRepo);
      result = await gitRepoService.addGitRepo(newRepo);
    });

    it('calls repository add with correct parameters', () => {
      expect(mockGitRepoRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ...newRepo,
          id: expect.any(String),
        }),
      );
    });

    it('returns the added git repository', () => {
      expect(result).toEqual(mockGitRepo);
    });
  });

  describe('findGitRepoById', () => {
    describe('when the repository exists and is standard', () => {
      let result: GitRepo | null;

      beforeEach(async () => {
        mockGitRepoRepository.findById.mockResolvedValue(mockGitRepo);
        result = await gitRepoService.findGitRepoById(
          createGitRepoId('repo-1'),
        );
      });

      it('calls repository findById with correct id', () => {
        expect(mockGitRepoRepository.findById).toHaveBeenCalledWith(
          createGitRepoId('repo-1'),
        );
      });

      it('returns the git repository', () => {
        expect(result).toEqual(mockGitRepo);
      });
    });

    describe('when the repository does not exist', () => {
      let result: GitRepo | null;

      beforeEach(async () => {
        mockGitRepoRepository.findById.mockResolvedValue(null);
        result = await gitRepoService.findGitRepoById(
          createGitRepoId('nonexistent-repo'),
        );
      });

      it('calls repository findById with correct id', () => {
        expect(mockGitRepoRepository.findById).toHaveBeenCalledWith(
          createGitRepoId('nonexistent-repo'),
        );
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });
    });

    describe('when the repository is marketplace-typed', () => {
      let result: GitRepo | null;

      beforeEach(async () => {
        const marketplaceRepo: GitRepo = gitRepoFactory({
          id: createGitRepoId('marketplace-repo-1'),
          type: 'marketplace',
        });
        mockGitRepoRepository.findById.mockResolvedValue(marketplaceRepo);
        result = await gitRepoService.findGitRepoById(
          createGitRepoId('marketplace-repo-1'),
        );
      });

      it('returns null so marketplace rows never leak through findGitRepoById', () => {
        expect(result).toBeNull();
      });
    });
  });

  describe('findGitRepoByOwnerAndRepo', () => {
    it('filters to type=standard by default', async () => {
      mockGitRepoRepository.findByOwnerAndRepo.mockResolvedValue(mockGitRepo);

      await gitRepoService.findGitRepoByOwnerAndRepo('test-owner', 'test-repo');

      expect(mockGitRepoRepository.findByOwnerAndRepo).toHaveBeenCalledWith(
        'test-owner',
        'test-repo',
        expect.objectContaining({ type: 'standard' }),
      );
    });

    it('propagates includeDeleted while keeping the standard type filter', async () => {
      mockGitRepoRepository.findByOwnerAndRepo.mockResolvedValue(null);

      await gitRepoService.findGitRepoByOwnerAndRepo(
        'test-owner',
        'test-repo',
        { includeDeleted: true },
      );

      expect(mockGitRepoRepository.findByOwnerAndRepo).toHaveBeenCalledWith(
        'test-owner',
        'test-repo',
        expect.objectContaining({ includeDeleted: true, type: 'standard' }),
      );
    });
  });

  describe('findGitRepoByOwnerRepoAndBranchInOrganization', () => {
    it('filters to type=standard by default', async () => {
      mockGitRepoRepository.findByOwnerRepoAndBranchInOrganization.mockResolvedValue(
        mockGitRepo,
      );

      await gitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization(
        'test-owner',
        'test-repo',
        'main',
        createOrganizationId('org-1'),
      );

      expect(
        mockGitRepoRepository.findByOwnerRepoAndBranchInOrganization,
      ).toHaveBeenCalledWith(
        'test-owner',
        'test-repo',
        'main',
        createOrganizationId('org-1'),
        expect.objectContaining({ type: 'standard' }),
      );
    });
  });

  describe('findGitReposByProviderId', () => {
    const mockRepos = [mockGitRepo];
    let result: GitRepo[];

    beforeEach(async () => {
      mockGitRepoRepository.findByProviderId.mockResolvedValue(mockRepos);
      result = await gitRepoService.findGitReposByProviderId(
        createGitProviderId('provider-1'),
      );
    });

    it('calls repository findByProviderId filtered to standard', () => {
      expect(mockGitRepoRepository.findByProviderId).toHaveBeenCalledWith(
        createGitProviderId('provider-1'),
        expect.objectContaining({ type: 'standard' }),
      );
    });

    it('returns repositories for the provider', () => {
      expect(result).toEqual(mockRepos);
    });
  });

  describe('findGitReposByOrganizationId', () => {
    const mockRepos = [mockGitRepo];
    let result: GitRepo[];

    beforeEach(async () => {
      mockGitRepoRepository.findByOrganizationId.mockResolvedValue(mockRepos);
      result = await gitRepoService.findGitReposByOrganizationId(
        createOrganizationId('org-1'),
      );
    });

    it('calls repository findByOrganizationId filtered to standard', () => {
      expect(mockGitRepoRepository.findByOrganizationId).toHaveBeenCalledWith(
        createOrganizationId('org-1'),
        expect.objectContaining({ type: 'standard' }),
      );
    });

    it('returns repositories for the organization', () => {
      expect(result).toEqual(mockRepos);
    });
  });

  describe('listGitRepos', () => {
    const mockRepos = [mockGitRepo];

    describe('when organizationId is provided', () => {
      let result: GitRepo[];

      beforeEach(async () => {
        mockGitRepoRepository.list.mockResolvedValue(mockRepos);
        result = await gitRepoService.listGitRepos(
          createOrganizationId('org-1'),
        );
      });

      it('calls repository list with the organization id filtered to standard', () => {
        expect(mockGitRepoRepository.list).toHaveBeenCalledWith(
          createOrganizationId('org-1'),
          expect.objectContaining({ type: 'standard' }),
        );
      });

      it('returns repositories for the organization', () => {
        expect(result).toEqual(mockRepos);
      });
    });

    describe('when organizationId is not provided', () => {
      let result: GitRepo[];

      beforeEach(async () => {
        mockGitRepoRepository.list.mockResolvedValue(mockRepos);
        result = await gitRepoService.listGitRepos();
      });

      it('calls repository list with undefined and the standard filter', () => {
        expect(mockGitRepoRepository.list).toHaveBeenCalledWith(
          undefined,
          expect.objectContaining({ type: 'standard' }),
        );
      });

      it('returns all repositories', () => {
        expect(result).toEqual(mockRepos);
      });
    });
  });

  describe('deleteGitRepo', () => {
    it('deletes a git repository', async () => {
      const userId = createUserId('some-user-id');

      mockGitRepoRepository.deleteById.mockResolvedValue();

      await gitRepoService.deleteGitRepo(createGitRepoId('repo-1'), userId);

      expect(mockGitRepoRepository.deleteById).toHaveBeenCalledWith(
        createGitRepoId('repo-1'),
        userId,
      );
    });
  });

  describe('findMarketplaceGitRepo', () => {
    const marketplaceRepo: GitRepo = gitRepoFactory({
      id: createGitRepoId('marketplace-repo-1'),
      type: 'marketplace',
    });
    let result: GitRepo | null;

    beforeEach(async () => {
      mockGitRepoRepository.findByOwnerAndRepoInOrganization.mockResolvedValue(
        marketplaceRepo,
      );

      result = await gitRepoService.findMarketplaceGitRepo(
        createOrganizationId('org-1'),
        'test-owner',
        'test-repo',
      );
    });

    it('filters to type=marketplace and scopes to the organization', () => {
      expect(
        mockGitRepoRepository.findByOwnerAndRepoInOrganization,
      ).toHaveBeenCalledWith(
        'test-owner',
        'test-repo',
        createOrganizationId('org-1'),
        expect.objectContaining({ type: 'marketplace' }),
      );
    });

    it('returns the marketplace repository', () => {
      expect(result).toEqual(marketplaceRepo);
    });
  });

  describe('findMarketplaceGitReposByOrganization', () => {
    const marketplaceRepos = [
      gitRepoFactory({ type: 'marketplace' }),
      gitRepoFactory({ type: 'marketplace' }),
    ];
    let result: GitRepo[];

    beforeEach(async () => {
      mockGitRepoRepository.findByOrganizationId.mockResolvedValue(
        marketplaceRepos,
      );

      result = await gitRepoService.findMarketplaceGitReposByOrganization(
        createOrganizationId('org-1'),
      );
    });

    it('filters to type=marketplace', () => {
      expect(mockGitRepoRepository.findByOrganizationId).toHaveBeenCalledWith(
        createOrganizationId('org-1'),
        expect.objectContaining({ type: 'marketplace' }),
      );
    });

    it('returns the marketplace repositories', () => {
      expect(result).toEqual(marketplaceRepos);
    });
  });

  describe('findGitRepoIgnoringType', () => {
    let result: GitRepo | null;

    beforeEach(async () => {
      mockGitRepoRepository.findByOwnerAndRepoInOrganization.mockResolvedValue(
        mockGitRepo,
      );

      result = await gitRepoService.findGitRepoIgnoringType(
        createOrganizationId('org-1'),
        'test-owner',
        'test-repo',
      );
    });

    it('passes the special "any" sentinel so neither type is excluded', () => {
      expect(
        mockGitRepoRepository.findByOwnerAndRepoInOrganization,
      ).toHaveBeenCalledWith(
        'test-owner',
        'test-repo',
        createOrganizationId('org-1'),
        expect.objectContaining({ type: 'any' }),
      );
    });

    it('returns the matched repository', () => {
      expect(result).toEqual(mockGitRepo);
    });
  });
});
