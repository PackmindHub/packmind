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
  });

  beforeEach(() => {
    mockGitRepoRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findByOwnerAndRepo: jest.fn(),
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
    describe('when repository exists', () => {
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

    describe('when repository does not exist', () => {
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

    it('calls repository findByProviderId with correct provider id', () => {
      expect(mockGitRepoRepository.findByProviderId).toHaveBeenCalledWith(
        createGitProviderId('provider-1'),
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

    it('calls repository findByOrganizationId with correct organization id', () => {
      expect(mockGitRepoRepository.findByOrganizationId).toHaveBeenCalledWith(
        createOrganizationId('org-1'),
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

      it('calls repository list with the organization id', () => {
        expect(mockGitRepoRepository.list).toHaveBeenCalledWith(
          createOrganizationId('org-1'),
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

      it('calls repository list with undefined', () => {
        expect(mockGitRepoRepository.list).toHaveBeenCalledWith(undefined);
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
});
