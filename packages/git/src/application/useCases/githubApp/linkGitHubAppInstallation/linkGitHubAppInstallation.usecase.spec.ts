import axios from 'axios';
import {
  GitHubInstallationNotFoundError,
  IAccountsPort,
  IImportInstallationRepositoriesUseCase,
  NoGitHubAppRegisteredError,
  Organization,
  User,
  createGitHubAppConfigId,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { IGitHubAppConfigRepository } from '../../../../domain/repositories/IGitHubAppConfigRepository';
import { GitProviderService } from '../../../GitProviderService';
import { GithubAppTokenService } from '../../../services/GithubAppTokenService';
import { LinkGitHubAppInstallationUseCase } from './linkGitHubAppInstallation.usecase';
import { gitProviderFactory } from '../../../../../test';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LinkGitHubAppInstallationUseCase', () => {
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
    clientSecret: 'secret',
    privateKey:
      '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----',
    webhookSecret: 'webhook-secret',
  };

  const githubInstallationResponse = {
    account: { login: 'my-org', type: 'Organization' },
    target_type: 'Organization',
    repository_selection: 'all',
  };

  const installationId = 42;

  let useCase: LinkGitHubAppInstallationUseCase;
  let gitHubAppConfigRepository: jest.Mocked<IGitHubAppConfigRepository>;
  let githubAppTokenService: jest.Mocked<GithubAppTokenService>;
  let gitProviderService: jest.Mocked<GitProviderService>;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let importInstallationRepositoriesUseCase: jest.Mocked<IImportInstallationRepositoriesUseCase>;

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(adminUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    gitHubAppConfigRepository = {
      findActive: jest.fn().mockResolvedValue(activeConfig),
      save: jest.fn(),
      deleteActive: jest.fn(),
    } as jest.Mocked<IGitHubAppConfigRepository>;

    githubAppTokenService = {
      generateAppJwt: jest.fn().mockReturnValue('app-jwt-token'),
      getInstallationToken: jest.fn(),
    } as unknown as jest.Mocked<GithubAppTokenService>;

    gitProviderService = {
      findGitProvidersByOrganizationId: jest.fn().mockResolvedValue([]),
      addGitProvider: jest.fn(),
      updateGitProvider: jest.fn(),
    } as unknown as jest.Mocked<GitProviderService>;

    mockedAxios.get = jest
      .fn()
      .mockResolvedValue({ data: githubInstallationResponse });
    mockedAxios.isAxiosError = jest.fn().mockReturnValue(false);

    importInstallationRepositoriesUseCase = {
      execute: jest
        .fn()
        .mockResolvedValue({ importedCount: 0, skippedCount: 0 }),
    } as jest.Mocked<IImportInstallationRepositoriesUseCase>;

    useCase = new LinkGitHubAppInstallationUseCase(
      accountsPort,
      gitHubAppConfigRepository,
      githubAppTokenService,
      gitProviderService,
      importInstallationRepositoriesUseCase,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildCommand = (overrides?: { installationId?: number }) => ({
    userId,
    organizationId,
    installationId: overrides?.installationId ?? installationId,
  });

  describe('when no GitHub App is registered', () => {
    beforeEach(() => {
      gitHubAppConfigRepository.findActive.mockResolvedValue(null);
    });

    it('throws NoGitHubAppRegisteredError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        NoGitHubAppRegisteredError,
      );
    });
  });

  describe('when GitHub returns 404 for the installation', () => {
    beforeEach(() => {
      const axiosError = { response: { status: 404 }, isAxiosError: true };
      mockedAxios.get = jest.fn().mockRejectedValue(axiosError);
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);
    });

    it('throws GitHubInstallationNotFoundError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        GitHubInstallationNotFoundError,
      );
    });
  });

  describe('when org has no existing GitHub App provider', () => {
    beforeEach(() => {
      gitProviderService.findGitProvidersByOrganizationId.mockResolvedValue([]);
      const newProvider = gitProviderFactory({
        organizationId,
        authType: 'github_app',
        githubAppInstallationId: installationId,
        token: null,
      });
      gitProviderService.addGitProvider.mockResolvedValue(newProvider);
    });

    it('creates a new GitHub App provider', async () => {
      await useCase.execute(buildCommand());
      expect(gitProviderService.addGitProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'github',
          authType: 'github_app',
          githubAppInstallationId: installationId,
          token: null,
        }),
      );
    });

    it('does not call updateGitProvider', async () => {
      await useCase.execute(buildCommand());
      expect(gitProviderService.updateGitProvider).not.toHaveBeenCalled();
    });
  });

  describe('when org already has a GitHub App provider', () => {
    let existingProvider: ReturnType<typeof gitProviderFactory>;

    beforeEach(() => {
      existingProvider = gitProviderFactory({
        organizationId,
        source: 'github',
        authType: 'github_app',
        githubAppInstallationId: 99,
      });
      gitProviderService.findGitProvidersByOrganizationId.mockResolvedValue([
        existingProvider,
      ]);
      gitProviderService.updateGitProvider.mockResolvedValue({
        ...existingProvider,
        githubAppInstallationId: installationId,
      });
    });

    it('updates the existing provider installation id', async () => {
      await useCase.execute(buildCommand());
      expect(gitProviderService.updateGitProvider).toHaveBeenCalledWith(
        existingProvider.id,
        { githubAppInstallationId: installationId },
      );
    });

    it('does not call addGitProvider', async () => {
      await useCase.execute(buildCommand());
      expect(gitProviderService.addGitProvider).not.toHaveBeenCalled();
    });
  });

  describe('happy path response', () => {
    beforeEach(() => {
      const newProvider = gitProviderFactory({
        organizationId,
        authType: 'github_app',
        githubAppInstallationId: installationId,
        token: null,
      });
      gitProviderService.addGitProvider.mockResolvedValue(newProvider);
    });

    it('returns installationAccount with GitHub-reported fields', async () => {
      const result = await useCase.execute(buildCommand());
      expect(result.installationAccount).toEqual({
        login: 'my-org',
        type: 'Organization',
        targetType: 'Organization',
        repositorySelection: 'all',
      });
    });

    it('returns the gitProvider in the response', async () => {
      const result = await useCase.execute(buildCommand());
      expect(result.gitProvider).toBeDefined();
    });
  });
});
