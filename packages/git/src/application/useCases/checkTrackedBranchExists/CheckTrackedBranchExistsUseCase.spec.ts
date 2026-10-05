import { Cache } from '@packmind/node-utils';
import { organizationFactory, userFactory } from '@packmind/accounts/test';
import { mockInterface, stubLogger } from '@packmind/test-utils';
import {
  GitProvider,
  GitRepo,
  GitRepoNotFoundError,
  IAccountsPort,
  MissingGitInputError,
  createGitProviderId,
  createGitRepoId,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';
import { CheckBranchExistsUseCase } from '../checkBranchExists/CheckBranchExistsUseCase';
import { CheckTrackedBranchExistsUseCase } from './CheckTrackedBranchExistsUseCase';

jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  Cache: {
    getInstance: jest.fn(),
  },
}));

const mockCacheInstance = mockInterface<Cache>();
const MockedCache = Cache as jest.Mocked<typeof Cache>;

const repositoryId = createGitRepoId('repo-1');
const userId = createUserId('user-1');
const organizationId = createOrganizationId('org-1');
const command = {
  repositoryId,
  userId,
  organizationId,
};

const gitProvider = {
  id: createGitProviderId('provider-1'),
  organizationId,
} as GitProvider;

const gitRepo = {
  id: repositoryId,
  owner: 'my-orga',
  repo: 'my-repo',
  branch: 'feature/login',
  providerId: createGitProviderId('provider-1'),
} as GitRepo;

describe('CheckTrackedBranchExistsUseCase', () => {
  let useCase: CheckTrackedBranchExistsUseCase;
  let gitRepoService: jest.Mocked<GitRepoService>;
  let gitProviderService: jest.Mocked<GitProviderService>;
  let checkBranchExists: jest.Mocked<CheckBranchExistsUseCase>;

  beforeEach(() => {
    gitRepoService = mockInterface<GitRepoService>();
    gitRepoService.findGitRepoById.mockResolvedValue(gitRepo);
    gitProviderService = mockInterface<GitProviderService>();
    gitProviderService.findGitProviderById.mockResolvedValue(gitProvider);
    checkBranchExists = mockInterface<CheckBranchExistsUseCase>();
    checkBranchExists.execute.mockResolvedValue(true);

    MockedCache.getInstance.mockReturnValue(mockCacheInstance);
    mockCacheInstance.get.mockResolvedValue(null);
    mockCacheInstance.set.mockResolvedValue(undefined);

    const accountsAdapter = mockInterface<IAccountsPort>();
    accountsAdapter.getUserById.mockResolvedValue(
      userFactory({
        id: userId,
        memberships: [{ userId, organizationId, role: 'member' }],
      }),
    );
    accountsAdapter.getOrganizationById.mockResolvedValue(
      organizationFactory({ id: organizationId }),
    );

    useCase = new CheckTrackedBranchExistsUseCase(
      gitRepoService,
      gitProviderService,
      checkBranchExists,
      accountsAdapter,
      stubLogger(),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('when nothing is cached', () => {
    let result: { exists: boolean };

    beforeEach(async () => {
      result = await useCase.execute(command);
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
      expect(result).toEqual({ exists: true });
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
    let result: { exists: boolean };

    beforeEach(async () => {
      mockCacheInstance.get.mockResolvedValue(false);
      result = await useCase.execute(command);
    });

    it('returns the cached answer', () => {
      expect(result).toEqual({ exists: false });
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

    it('throws a repository not found error', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        GitRepoNotFoundError,
      );
    });
  });

  // A repository of another organization and one that does not exist are the
  // same answer by design.
  describe('when the repository belongs to another organization', () => {
    beforeEach(() => {
      gitProviderService.findGitProviderById.mockResolvedValue({
        ...gitProvider,
        organizationId: createOrganizationId('org-2'),
      });
    });

    it('throws a repository not found error', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        GitRepoNotFoundError,
      );
    });

    it('does not call the provider', async () => {
      await useCase.execute(command).catch(() => undefined);

      expect(checkBranchExists.execute).not.toHaveBeenCalled();
    });

    // The cached answer was computed for the owning organization.
    it('does not read the cache', async () => {
      await useCase.execute(command).catch(() => undefined);

      expect(mockCacheInstance.get).not.toHaveBeenCalled();
    });
  });

  describe("when the repository's provider no longer exists", () => {
    beforeEach(() => {
      gitProviderService.findGitProviderById.mockResolvedValue(null);
    });

    it('throws a repository not found error', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        GitRepoNotFoundError,
      );
    });
  });

  describe('when no repository id is given', () => {
    it('throws', async () => {
      await expect(
        useCase.execute({
          ...command,
          repositoryId: '' as typeof repositoryId,
        }),
      ).rejects.toBeInstanceOf(MissingGitInputError);
    });
  });
});
