import { CheckProviderBranchExistsUseCase } from './CheckProviderBranchExistsUseCase';
import { GitProviderService } from '../../GitProviderService';
import { CheckBranchExistsUseCase } from '../checkBranchExists/CheckBranchExistsUseCase';
import {
  CheckProviderBranchExistsCommand,
  GitProviderOrganizationMismatchError,
  IAccountsPort,
  createGitProviderId,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { organizationFactory, userFactory } from '@packmind/accounts/test';
import { stubLogger, mockInterface } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import { gitProviderFactory } from '../../../../test';

describe('CheckProviderBranchExistsUseCase', () => {
  let useCase: CheckProviderBranchExistsUseCase;
  let gitProviderService: jest.Mocked<GitProviderService>;
  let checkBranchExists: jest.Mocked<CheckBranchExistsUseCase>;
  let accountsAdapter: jest.Mocked<IAccountsPort>;
  let command: CheckProviderBranchExistsCommand;

  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const gitProviderId = createGitProviderId(uuidv4());

  beforeEach(() => {
    gitProviderService = {
      findGitProviderById: jest.fn(),
    } as Partial<
      jest.Mocked<GitProviderService>
    > as jest.Mocked<GitProviderService>;

    checkBranchExists = {
      execute: jest.fn(),
    } as Partial<
      jest.Mocked<CheckBranchExistsUseCase>
    > as jest.Mocked<CheckBranchExistsUseCase>;

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

    useCase = new CheckProviderBranchExistsUseCase(
      gitProviderService,
      checkBranchExists,
      accountsAdapter,
      stubLogger(),
    );

    command = {
      userId,
      organizationId,
      gitProviderId,
      owner: 'acme',
      repo: 'website',
      branch: 'feature/new-home',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the branch exists on a provider of the organization', () => {
    beforeEach(() => {
      gitProviderService.findGitProviderById.mockResolvedValue(
        gitProviderFactory({ id: gitProviderId, organizationId }),
      );
      checkBranchExists.execute.mockResolvedValue(true);
    });

    it('returns exists true', async () => {
      expect(await useCase.execute(command)).toEqual({ exists: true });
    });

    it('asks the provider for the typed branch', async () => {
      await useCase.execute(command);

      expect(checkBranchExists.execute).toHaveBeenCalledWith({
        gitProviderId,
        owner: 'acme',
        repo: 'website',
        branch: 'feature/new-home',
      });
    });
  });

  describe('when the branch does not exist', () => {
    it('returns exists false', async () => {
      gitProviderService.findGitProviderById.mockResolvedValue(
        gitProviderFactory({ id: gitProviderId, organizationId }),
      );
      checkBranchExists.execute.mockResolvedValue(false);

      expect(await useCase.execute(command)).toEqual({ exists: false });
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

      expect(checkBranchExists.execute).not.toHaveBeenCalled();
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

      expect(checkBranchExists.execute).not.toHaveBeenCalled();
    });
  });

  describe('when the user is not a member of the organization', () => {
    beforeEach(() => {
      accountsAdapter.getUserById.mockResolvedValue(
        userFactory({ id: userId, memberships: [] }),
      );
    });

    it('never looks up the provider', async () => {
      await useCase.execute(command).catch(() => undefined);

      expect(gitProviderService.findGitProviderById).not.toHaveBeenCalled();
    });
  });
});
