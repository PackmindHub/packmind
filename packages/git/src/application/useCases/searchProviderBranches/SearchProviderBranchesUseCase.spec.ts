import { SearchProviderBranchesUseCase } from './SearchProviderBranchesUseCase';
import { GitProviderService } from '../../GitProviderService';
import {
  GitProviderOrganizationMismatchError,
  IAccountsPort,
  SearchProviderBranchesCommand,
  createGitProviderId,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { organizationFactory, userFactory } from '@packmind/accounts/test';
import { stubLogger, mockInterface } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import { gitProviderFactory } from '../../../../test';

describe('SearchProviderBranchesUseCase', () => {
  let useCase: SearchProviderBranchesUseCase;
  let gitProviderService: jest.Mocked<GitProviderService>;
  let accountsAdapter: jest.Mocked<IAccountsPort>;
  let command: SearchProviderBranchesCommand;

  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const gitProviderId = createGitProviderId(uuidv4());

  beforeEach(() => {
    gitProviderService = {
      findGitProviderById: jest.fn(),
      searchBranches: jest.fn(),
    } as Partial<
      jest.Mocked<GitProviderService>
    > as jest.Mocked<GitProviderService>;

    accountsAdapter = mockInterface<IAccountsPort>();
    accountsAdapter.getUserById.mockResolvedValue(
      userFactory({
        id: userId,
        memberships: [{ userId, organizationId, role: 'member' }],
      }),
    );
    accountsAdapter.getOrganizationById.mockResolvedValue(
      organizationFactory({ id: organizationId }),
    );

    useCase = new SearchProviderBranchesUseCase(
      gitProviderService,
      accountsAdapter,
      stubLogger(),
    );

    command = {
      userId,
      organizationId,
      gitProviderId,
      owner: 'acme',
      repo: 'website',
      search: '  feature/  ',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the provider belongs to the organization', () => {
    beforeEach(() => {
      gitProviderService.findGitProviderById.mockResolvedValue(
        gitProviderFactory({ id: gitProviderId, organizationId }),
      );
      gitProviderService.searchBranches.mockResolvedValue([
        'feature/home',
        'feature/login',
      ]);
    });

    it('returns the branches the provider found', async () => {
      expect(await useCase.execute(command)).toEqual({
        branches: ['feature/home', 'feature/login'],
      });
    });

    it('asks the provider for the trimmed search, at most 20 branches', async () => {
      await useCase.execute(command);

      expect(gitProviderService.searchBranches).toHaveBeenCalledWith(
        gitProviderId,
        'acme',
        'website',
        'feature/',
        20,
      );
    });
  });

  describe('when the provider belongs to another organization', () => {
    beforeEach(() => {
      gitProviderService.findGitProviderById.mockResolvedValue(
        gitProviderFactory({
          id: gitProviderId,
          organizationId: createOrganizationId(uuidv4()),
        }),
      );
    });

    it('throws GitProviderOrganizationMismatchError', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        GitProviderOrganizationMismatchError,
      );
    });

    it('never asks the provider', async () => {
      await useCase.execute(command).catch(() => undefined);

      expect(gitProviderService.searchBranches).not.toHaveBeenCalled();
    });
  });

  describe('when the provider does not exist', () => {
    beforeEach(() => {
      gitProviderService.findGitProviderById.mockResolvedValue(null);
    });

    it('throws GitProviderOrganizationMismatchError', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        GitProviderOrganizationMismatchError,
      );
    });

    it('never asks the provider', async () => {
      await useCase.execute(command).catch(() => undefined);

      expect(gitProviderService.searchBranches).not.toHaveBeenCalled();
    });
  });

  describe('when the user is not a member of the organization', () => {
    beforeEach(() => {
      accountsAdapter.getUserById.mockResolvedValue(
        userFactory({ id: userId, memberships: [] }),
      );
    });

    it('rejects the request', async () => {
      await expect(useCase.execute(command)).rejects.toThrow();
    });

    it('never looks up the provider', async () => {
      await useCase.execute(command).catch(() => undefined);

      expect(gitProviderService.findGitProviderById).not.toHaveBeenCalled();
    });
  });
});
