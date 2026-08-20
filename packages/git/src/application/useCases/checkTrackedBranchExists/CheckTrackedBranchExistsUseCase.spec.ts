import { Cache } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import { GitRepo, createGitProviderId, createGitRepoId } from '@packmind/types';
import { GitRepoService } from '../../GitRepoService';
import { CheckBranchExistsUseCase } from '../checkBranchExists/CheckBranchExistsUseCase';
import { CheckTrackedBranchExistsUseCase } from './CheckTrackedBranchExistsUseCase';

jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  Cache: {
    getInstance: jest.fn(),
  },
}));

const mockCacheInstance = {
  get: jest.fn(),
  set: jest.fn(),
  invalidate: jest.fn(),
} as jest.Mocked<Pick<Cache, 'get' | 'set' | 'invalidate'>>;
const MockedCache = Cache as jest.Mocked<typeof Cache>;

const repositoryId = createGitRepoId('repo-1');

const gitRepo = {
  id: repositoryId,
  owner: 'my-orga',
  repo: 'my-repo',
  branch: 'feature/login',
  providerId: createGitProviderId('provider-1'),
} as GitRepo;

describe('CheckTrackedBranchExistsUseCase', () => {
  let useCase: CheckTrackedBranchExistsUseCase;
  let gitRepoService: jest.Mocked<Pick<GitRepoService, 'findGitRepoById'>>;
  let checkBranchExists: jest.Mocked<Pick<CheckBranchExistsUseCase, 'execute'>>;

  beforeEach(() => {
    gitRepoService = { findGitRepoById: jest.fn().mockResolvedValue(gitRepo) };
    checkBranchExists = { execute: jest.fn().mockResolvedValue(true) };

    MockedCache.getInstance.mockReturnValue(
      mockCacheInstance as unknown as Cache,
    );
    mockCacheInstance.get.mockResolvedValue(null);
    mockCacheInstance.set.mockResolvedValue(undefined);

    useCase = new CheckTrackedBranchExistsUseCase(
      gitRepoService as unknown as GitRepoService,
      checkBranchExists as unknown as CheckBranchExistsUseCase,
      stubLogger(),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('when nothing is cached', () => {
    let result: boolean;

    beforeEach(async () => {
      result = await useCase.execute({ repositoryId });
    });

    // The caller names a repository; the branch comes from the stored record.
    it('asks the provider about the branch the repository is tracked on', () => {
      expect(checkBranchExists.execute).toHaveBeenCalledWith({
        gitProviderId: gitRepo.providerId,
        owner: 'my-orga',
        repo: 'my-repo',
        branch: 'feature/login',
      });
    });

    it('returns the provider answer', () => {
      expect(result).toBe(true);
    });

    // The branch belongs in the key: moving tracking must not inherit the
    // previous branch's answer.
    it('caches the answer under the repository and branch', () => {
      expect(mockCacheInstance.set).toHaveBeenCalledWith(
        'tracked-branch-exists:repo-1:feature/login',
        true,
        300,
      );
    });
  });

  describe('when a deleted branch is already cached', () => {
    let result: boolean;

    beforeEach(async () => {
      mockCacheInstance.get.mockResolvedValue(false);
      result = await useCase.execute({ repositoryId });
    });

    it('returns the cached answer', () => {
      expect(result).toBe(false);
    });

    // A page listing many repositories would otherwise spend one provider API
    // call per repository on every render.
    it('does not call the provider', () => {
      expect(checkBranchExists.execute).not.toHaveBeenCalled();
    });
  });

  describe('when the repository is unknown', () => {
    beforeEach(() => {
      gitRepoService.findGitRepoById.mockResolvedValue(null);
    });

    it('throws naming the repository', async () => {
      await expect(useCase.execute({ repositoryId })).rejects.toThrow(
        `Repository with ID ${repositoryId} not found`,
      );
    });
  });

  describe('when no repository id is given', () => {
    it('throws', async () => {
      await expect(
        useCase.execute({ repositoryId: '' as typeof repositoryId }),
      ).rejects.toThrow('Repository ID is required');
    });
  });
});
