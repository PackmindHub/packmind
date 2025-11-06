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
    it('adds a git repository', async () => {
      const newRepo = { ...mockGitRepo };
      delete newRepo.id;

      mockGitRepoRepository.add.mockResolvedValue(mockGitRepo);

      const result = await gitRepoService.addGitRepo(newRepo);

      expect(mockGitRepoRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ...newRepo,
          id: expect.any(String),
        }),
      );
      expect(result).toEqual(mockGitRepo);
    });
  });

  describe('findGitRepoById', () => {
    describe('when repository exists', () => {
      it('returns the git repository', async () => {
        mockGitRepoRepository.findById.mockResolvedValue(mockGitRepo);

        const result = await gitRepoService.findGitRepoById(
          createGitRepoId('repo-1'),
        );

        expect(mockGitRepoRepository.findById).toHaveBeenCalledWith(
          createGitRepoId('repo-1'),
        );
        expect(result).toEqual(mockGitRepo);
      });
    });

    describe('when repository does not exist', () => {
      it('returns null', async () => {
        mockGitRepoRepository.findById.mockResolvedValue(null);

        const result = await gitRepoService.findGitRepoById(
          createGitRepoId('nonexistent-repo'),
        );

        expect(mockGitRepoRepository.findById).toHaveBeenCalledWith(
          createGitRepoId('nonexistent-repo'),
        );
        expect(result).toBeNull();
      });
    });
  });

  describe('findGitReposByProviderId', () => {
    it('returns repositories for a provider', async () => {
      const mockRepos = [mockGitRepo];
      mockGitRepoRepository.findByProviderId.mockResolvedValue(mockRepos);

      const result = await gitRepoService.findGitReposByProviderId(
        createGitProviderId('provider-1'),
      );

      expect(mockGitRepoRepository.findByProviderId).toHaveBeenCalledWith(
        createGitProviderId('provider-1'),
      );
      expect(result).toEqual(mockRepos);
    });
  });

  describe('findGitReposByOrganizationId', () => {
    it('returns repositories for an organization', async () => {
      const mockRepos = [mockGitRepo];
      mockGitRepoRepository.findByOrganizationId.mockResolvedValue(mockRepos);

      const result = await gitRepoService.findGitReposByOrganizationId(
        createOrganizationId('org-1'),
      );

      expect(mockGitRepoRepository.findByOrganizationId).toHaveBeenCalledWith(
        createOrganizationId('org-1'),
      );
      expect(result).toEqual(mockRepos);
    });
  });

  describe('listGitRepos', () => {
    describe('when organizationId is provided', () => {
      it('returns repositories for the organization', async () => {
        const mockRepos = [mockGitRepo];
        mockGitRepoRepository.list.mockResolvedValue(mockRepos);

        const result = await gitRepoService.listGitRepos(
          createOrganizationId('org-1'),
        );

        expect(mockGitRepoRepository.list).toHaveBeenCalledWith(
          createOrganizationId('org-1'),
        );
        expect(result).toEqual(mockRepos);
      });
    });

    describe('when organizationId is not provided', () => {
      it('returns all repositories', async () => {
        const mockRepos = [mockGitRepo];
        mockGitRepoRepository.list.mockResolvedValue(mockRepos);

        const result = await gitRepoService.listGitRepos();

        expect(mockGitRepoRepository.list).toHaveBeenCalledWith(undefined);
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
