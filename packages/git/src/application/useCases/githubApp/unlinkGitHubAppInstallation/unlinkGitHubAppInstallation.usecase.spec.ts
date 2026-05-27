import {
  IAccountsPort,
  Organization,
  User,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { GitProviderService } from '../../../GitProviderService';
import { UnlinkGitHubAppInstallationUseCase } from './unlinkGitHubAppInstallation.usecase';
import { gitProviderFactory } from '../../../../../test';

describe('UnlinkGitHubAppInstallationUseCase', () => {
  const organizationId = createOrganizationId('org-123');
  const userId = createUserId('admin-user');

  const adminUser: User = {
    id: userId,
    email: 'admin@example.com',
    passwordHash: null,
    active: true,
    memberships: [{ userId, organizationId, role: 'admin' }],
  };

  const organization: Organization = {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
  };

  let useCase: UnlinkGitHubAppInstallationUseCase;
  let gitProviderService: jest.Mocked<GitProviderService>;
  let accountsPort: jest.Mocked<IAccountsPort>;

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(adminUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    gitProviderService = {
      findGitProvidersByOrganizationId: jest.fn().mockResolvedValue([]),
      updateGitProvider: jest.fn(),
    } as unknown as jest.Mocked<GitProviderService>;

    useCase = new UnlinkGitHubAppInstallationUseCase(
      accountsPort,
      gitProviderService,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildCommand = () => ({ userId, organizationId });

  describe('when no GitHub App provider exists for the org', () => {
    it('returns unlinked: false', async () => {
      const result = await useCase.execute(buildCommand());
      expect(result).toEqual({ unlinked: false });
    });

    it('does not call updateGitProvider', async () => {
      await useCase.execute(buildCommand());
      expect(gitProviderService.updateGitProvider).not.toHaveBeenCalled();
    });
  });

  describe('when a GitHub App provider exists for the org', () => {
    let appProvider: ReturnType<typeof gitProviderFactory>;

    beforeEach(() => {
      appProvider = gitProviderFactory({
        organizationId,
        source: 'github',
        authType: 'github_app',
        githubAppInstallationId: 42,
      });
      gitProviderService.findGitProvidersByOrganizationId.mockResolvedValue([
        appProvider,
      ]);
      gitProviderService.updateGitProvider.mockResolvedValue({
        ...appProvider,
        authType: 'pat',
        githubAppInstallationId: null,
        token: null,
      });
    });

    it('returns unlinked: true', async () => {
      const result = await useCase.execute(buildCommand());
      expect(result).toEqual({ unlinked: true });
    });

    it('clears the App fields on the provider', async () => {
      await useCase.execute(buildCommand());
      expect(gitProviderService.updateGitProvider).toHaveBeenCalledWith(
        appProvider.id,
        { authType: 'pat', githubAppInstallationId: null, token: null },
      );
    });
  });

  describe('when org has a PAT provider but no App provider', () => {
    beforeEach(() => {
      const patProvider = gitProviderFactory({
        organizationId,
        source: 'github',
        authType: 'pat',
        token: 'ghp_sometoken',
      });
      gitProviderService.findGitProvidersByOrganizationId.mockResolvedValue([
        patProvider,
      ]);
    });

    it('returns unlinked: false', async () => {
      const result = await useCase.execute(buildCommand());
      expect(result).toEqual({ unlinked: false });
    });
  });
});
