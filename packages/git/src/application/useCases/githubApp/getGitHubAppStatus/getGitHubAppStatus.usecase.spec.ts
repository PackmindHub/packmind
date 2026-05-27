import {
  IAccountsPort,
  Organization,
  User,
  createGitHubAppConfigId,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { IGitHubAppConfigRepository } from '../../../../domain/repositories/IGitHubAppConfigRepository';
import { GetGitHubAppStatusUseCase } from './getGitHubAppStatus.usecase';

describe('GetGitHubAppStatusUseCase', () => {
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

  const activeConfig = {
    id: createGitHubAppConfigId('cfg-id'),
    appId: 12345,
    slug: 'my-packmind-app',
    htmlUrl: 'https://github.com/apps/my-packmind-app',
    clientId: 'Iv1.abc123',
    clientSecret: 'encrypted-secret',
    privateKey: 'encrypted-key',
    webhookSecret: 'encrypted-webhook',
  };

  let useCase: GetGitHubAppStatusUseCase;
  let gitHubAppConfigRepository: jest.Mocked<IGitHubAppConfigRepository>;
  let accountsPort: jest.Mocked<IAccountsPort>;

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(adminUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    gitHubAppConfigRepository = {
      findActive: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
      deleteActive: jest.fn(),
    } as jest.Mocked<IGitHubAppConfigRepository>;

    useCase = new GetGitHubAppStatusUseCase(
      accountsPort,
      gitHubAppConfigRepository,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildCommand = () => ({ userId, organizationId });

  describe('when no GitHub App is registered', () => {
    it('returns registered: false', async () => {
      const result = await useCase.execute(buildCommand());
      expect(result).toEqual({ registered: false });
    });
  });

  describe('when a GitHub App is registered', () => {
    beforeEach(() => {
      gitHubAppConfigRepository.findActive.mockResolvedValue(activeConfig);
    });

    it('returns registered: true with the app summary', async () => {
      const result = await useCase.execute(buildCommand());
      expect(result).toEqual({
        registered: true,
        slug: activeConfig.slug,
        appId: activeConfig.appId,
        htmlUrl: activeConfig.htmlUrl,
        installUrl: `${activeConfig.htmlUrl}/installations/new?state=${organizationId}`,
      });
    });

    it('includes the organizationId as state in the install URL', async () => {
      const result = await useCase.execute(buildCommand());
      if (!result.registered) throw new Error('Expected registered: true');
      expect(result.installUrl).toContain(`state=${organizationId}`);
    });
  });
});
