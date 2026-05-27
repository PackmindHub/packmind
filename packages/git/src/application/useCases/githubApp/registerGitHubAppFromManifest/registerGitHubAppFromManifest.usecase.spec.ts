import axios from 'axios';
import {
  AppAlreadyRegisteredError,
  IAccountsPort,
  InvalidManifestStateError,
  Organization,
  User,
  createGitHubAppConfigId,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { IGitHubAppConfigRepository } from '../../../../domain/repositories/IGitHubAppConfigRepository';
import { GitHubAppManifestStateService } from '../../../services/GitHubAppManifestStateService';
import { RegisterGitHubAppFromManifestUseCase } from './registerGitHubAppFromManifest.usecase';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RegisterGitHubAppFromManifestUseCase', () => {
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

  const githubConversionData = {
    id: 12345,
    slug: 'my-packmind-app',
    html_url: 'https://github.com/apps/my-packmind-app',
    client_id: 'Iv1.abc123',
    client_secret: 'secret-value',
    pem: '-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----',
    webhook_secret: 'webhook-secret-value',
  };

  const savedConfig = {
    id: createGitHubAppConfigId('cfg-id'),
    appId: githubConversionData.id,
    slug: githubConversionData.slug,
    htmlUrl: githubConversionData.html_url,
    clientId: githubConversionData.client_id,
    clientSecret: githubConversionData.client_secret,
    privateKey: githubConversionData.pem,
    webhookSecret: githubConversionData.webhook_secret,
  };

  let useCase: RegisterGitHubAppFromManifestUseCase;
  let gitHubAppConfigRepository: jest.Mocked<IGitHubAppConfigRepository>;
  let manifestStateService: jest.Mocked<GitHubAppManifestStateService>;
  let accountsPort: jest.Mocked<IAccountsPort>;

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(adminUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    gitHubAppConfigRepository = {
      findActive: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(savedConfig),
      deleteActive: jest.fn(),
    } as jest.Mocked<IGitHubAppConfigRepository>;

    manifestStateService = {
      consume: jest.fn().mockReturnValue(true),
      issue: jest.fn(),
      destroy: jest.fn(),
    } as unknown as jest.Mocked<GitHubAppManifestStateService>;

    mockedAxios.post = jest
      .fn()
      .mockResolvedValue({ data: githubConversionData });

    useCase = new RegisterGitHubAppFromManifestUseCase(
      accountsPort,
      gitHubAppConfigRepository,
      manifestStateService,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildCommand = (overrides?: { code?: string; state?: string }) => ({
    userId,
    organizationId,
    code: overrides?.code ?? 'github-code-abc',
    state: overrides?.state ?? 'valid-state-token',
  });

  describe('when state is invalid or expired', () => {
    beforeEach(() => {
      manifestStateService.consume.mockReturnValue(false);
    });

    it('throws InvalidManifestStateError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        InvalidManifestStateError,
      );
    });

    it('does not call the GitHub conversions API', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('when a GitHub App is already registered', () => {
    beforeEach(() => {
      gitHubAppConfigRepository.findActive.mockResolvedValue(savedConfig);
    });

    it('throws AppAlreadyRegisteredError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        AppAlreadyRegisteredError,
      );
    });

    it('does not call the GitHub conversions API', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('happy path', () => {
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      result = await useCase.execute(buildCommand());
    });

    it('calls the GitHub conversions API with the provided code', () => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.github.com/app-manifests/github-code-abc/conversions',
        null,
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/vnd.github+json',
          }),
        }),
      );
    });

    it('persists the App config via repository', () => {
      expect(gitHubAppConfigRepository.save).toHaveBeenCalledWith({
        appId: githubConversionData.id,
        slug: githubConversionData.slug,
        htmlUrl: githubConversionData.html_url,
        clientId: githubConversionData.client_id,
        clientSecret: githubConversionData.client_secret,
        privateKey: githubConversionData.pem,
        webhookSecret: githubConversionData.webhook_secret,
      });
    });

    it('returns the public summary without secret fields', () => {
      expect(result).toEqual({
        id: savedConfig.id,
        appId: savedConfig.appId,
        slug: savedConfig.slug,
        htmlUrl: savedConfig.htmlUrl,
        clientId: savedConfig.clientId,
      });
    });

    it('does not expose clientSecret in the response', () => {
      expect(result).not.toHaveProperty('clientSecret');
    });

    it('does not expose privateKey in the response', () => {
      expect(result).not.toHaveProperty('privateKey');
    });

    it('does not expose webhookSecret in the response', () => {
      expect(result).not.toHaveProperty('webhookSecret');
    });
  });
});
