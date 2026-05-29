import {
  GithubTokenResolverFactory,
  IConfigProvider,
  resolveEdition,
} from './GithubTokenResolverFactory';
import { PatTokenResolver } from './PatTokenResolver';
import { AppInstallationTokenResolver } from './AppInstallationTokenResolver';
import {
  GitProvider,
  OrganizationGitHubApp,
  createGitProviderId,
  createOrganizationId,
  createOrganizationGitHubAppId,
} from '@packmind/types';
import { IOrganizationGitHubAppRepository } from '../../../../domain/repositories/IOrganizationGitHubAppRepository';

const makeProvider = (overrides: Partial<GitProvider> = {}): GitProvider =>
  ({
    id: createGitProviderId('fixture-provider-id'),
    source: 'github' as const,
    organizationId: createOrganizationId('fixture-org-id'),
    url: null,
    token: 'ghp_pat_fixture',
    authMethod: 'token' as const,
    revokedAt: null,
    ...overrides,
  }) as GitProvider;

const makeOrgApp = (
  overrides: Partial<OrganizationGitHubApp> = {},
): OrganizationGitHubApp => ({
  id: createOrganizationGitHubAppId('fixture-app-id'),
  organizationId: createOrganizationId('fixture-org-id'),
  appId: 777777,
  appSlug: 'my-oss-app',
  appClientId: 'Iv1.fixture',
  appClientSecret: 'fixture-client-secret',
  appPrivateKey:
    '-----BEGIN RSA PRIVATE KEY-----\nOSS-PEM\n-----END RSA PRIVATE KEY-----',
  appWebhookSecret: 'fixture-webhook-secret',
  revokedAt: null,
  ...overrides,
});

class StubConfig implements IConfigProvider {
  constructor(private readonly values: Record<string, string | null>) {}
  async getConfig(key: string): Promise<string | null> {
    return this.values[key] ?? null;
  }
}

class StubOrgGitHubAppRepository implements Pick<
  IOrganizationGitHubAppRepository,
  'findActiveByOrganizationId'
> {
  constructor(private readonly result: OrganizationGitHubApp | null) {}

  async findActiveByOrganizationId(): Promise<OrganizationGitHubApp | null> {
    return this.result;
  }
}

describe('GithubTokenResolverFactory', () => {
  afterEach(() => jest.clearAllMocks());

  describe('authMethod = "token"', () => {
    it('returns a PatTokenResolver constructed with provider.token', async () => {
      const factory = new GithubTokenResolverFactory(
        new StubConfig({}),
        'cloud',
      );
      const provider = makeProvider({
        authMethod: 'token',
        token: 'ghp_actual',
      });

      const resolver = await factory.build(provider);

      expect(resolver).toBeInstanceOf(PatTokenResolver);
      await expect(resolver.getToken()).resolves.toBe('ghp_actual');
    });

    it('throws when authMethod = "token" but token is empty', async () => {
      const factory = new GithubTokenResolverFactory(
        new StubConfig({}),
        'cloud',
      );
      const provider = makeProvider({ authMethod: 'token', token: null });

      await expect(factory.build(provider)).rejects.toThrow(
        /provider\.token is empty/,
      );
    });
  });

  describe('authMethod = "app", edition = "cloud"', () => {
    it('reads GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY from config and returns AppInstallationTokenResolver', async () => {
      const config = new StubConfig({
        GITHUB_APP_ID: '123456',
        GITHUB_APP_PRIVATE_KEY:
          '-----BEGIN RSA PRIVATE KEY-----\nMOCK\n-----END RSA PRIVATE KEY-----',
      });
      const factory = new GithubTokenResolverFactory(config, 'cloud');
      const provider = makeProvider({
        authMethod: 'app',
        appInstallationId: 987654,
        appId: undefined,
        appPrivateKey: undefined,
      });

      const resolver = await factory.build(provider);

      expect(resolver).toBeInstanceOf(AppInstallationTokenResolver);
    });

    it('throws a clear error when GITHUB_APP_ID is missing', async () => {
      const config = new StubConfig({
        GITHUB_APP_PRIVATE_KEY: 'pem',
      });
      const factory = new GithubTokenResolverFactory(config, 'cloud');
      const provider = makeProvider({
        authMethod: 'app',
        appInstallationId: 987654,
      });

      await expect(factory.build(provider)).rejects.toThrow(
        /GITHUB_APP_ID is not configured/,
      );
    });

    it('throws a clear error when GITHUB_APP_PRIVATE_KEY is missing', async () => {
      const config = new StubConfig({
        GITHUB_APP_ID: '123456',
      });
      const factory = new GithubTokenResolverFactory(config, 'cloud');
      const provider = makeProvider({
        authMethod: 'app',
        appInstallationId: 987654,
      });

      await expect(factory.build(provider)).rejects.toThrow(
        /GITHUB_APP_PRIVATE_KEY is not configured/,
      );
    });

    it('throws when appInstallationId is missing', async () => {
      const config = new StubConfig({
        GITHUB_APP_ID: '123456',
        GITHUB_APP_PRIVATE_KEY: 'pem',
      });
      const factory = new GithubTokenResolverFactory(config, 'cloud');
      const provider = makeProvider({
        authMethod: 'app',
        appInstallationId: undefined,
      });

      await expect(factory.build(provider)).rejects.toThrow(
        /appInstallationId is missing/,
      );
    });
  });

  describe('authMethod = "app", edition = "oss"', () => {
    it('reads appId and appPrivateKey from active OrganizationGitHubApp and returns AppInstallationTokenResolver', async () => {
      const orgApp = makeOrgApp();
      const repo = new StubOrgGitHubAppRepository(orgApp);
      const factory = new GithubTokenResolverFactory(
        new StubConfig({}),
        'oss',
        undefined,
        repo as unknown as IOrganizationGitHubAppRepository,
      );
      const provider = makeProvider({
        authMethod: 'app',
        appInstallationId: 111222,
      });

      const resolver = await factory.build(provider);

      expect(resolver).toBeInstanceOf(AppInstallationTokenResolver);
    });

    it('throws when no active OrganizationGitHubApp exists for the organization', async () => {
      const repo = new StubOrgGitHubAppRepository(null);
      const factory = new GithubTokenResolverFactory(
        new StubConfig({}),
        'oss',
        undefined,
        repo as unknown as IOrganizationGitHubAppRepository,
      );
      const provider = makeProvider({
        authMethod: 'app',
        appInstallationId: 111222,
      });

      await expect(factory.build(provider)).rejects.toThrow(
        /no active OrganizationGitHubApp found for organization/,
      );
    });

    it('throws when orgGitHubAppRepository is not provided', async () => {
      const factory = new GithubTokenResolverFactory(
        new StubConfig({}),
        'oss',
        undefined,
        null,
      );
      const provider = makeProvider({
        authMethod: 'app',
        appInstallationId: 111222,
      });

      await expect(factory.build(provider)).rejects.toThrow(
        /orgGitHubAppRepository is required for oss edition/,
      );
    });

    it('throws when the error message includes the organization id', async () => {
      const orgId = createOrganizationId('specific-org-id');
      const repo = new StubOrgGitHubAppRepository(null);
      const factory = new GithubTokenResolverFactory(
        new StubConfig({}),
        'oss',
        undefined,
        repo as unknown as IOrganizationGitHubAppRepository,
      );
      const provider = makeProvider({
        authMethod: 'app',
        appInstallationId: 111222,
        organizationId: orgId,
      });

      await expect(factory.build(provider)).rejects.toThrow(/specific-org-id/);
    });
  });

  describe('resolveEdition', () => {
    it('returns "oss" when PACKMIND_EDITION=oss', () => {
      expect(resolveEdition({ PACKMIND_EDITION: 'oss' })).toBe('oss');
    });

    it('returns "cloud" when PACKMIND_EDITION=proprietary', () => {
      expect(resolveEdition({ PACKMIND_EDITION: 'proprietary' })).toBe('cloud');
    });

    it('returns "cloud" when PACKMIND_EDITION is unset', () => {
      expect(resolveEdition({})).toBe('cloud');
    });
  });
});
