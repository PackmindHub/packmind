import {
  GithubTokenResolverFactory,
  IConfigProvider,
  resolveEdition,
} from './GithubTokenResolverFactory';
import { PatTokenResolver } from './PatTokenResolver';
import { AppInstallationTokenResolver } from './AppInstallationTokenResolver';
import {
  GitProvider,
  createGitProviderId,
  createOrganizationId,
} from '@packmind/types';

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

class StubConfig implements IConfigProvider {
  constructor(private readonly values: Record<string, string | null>) {}
  async getConfig(key: string): Promise<string | null> {
    return this.values[key] ?? null;
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
    it('reads appId, appPrivateKey, appInstallationId from the provider row and returns AppInstallationTokenResolver', async () => {
      // These cloud config values should be ignored on OSS
      const config = new StubConfig({
        GITHUB_APP_ID: 'wrong-cloud-id',
        GITHUB_APP_PRIVATE_KEY: 'wrong-cloud-key',
      });
      const factory = new GithubTokenResolverFactory(config, 'oss');
      const provider = makeProvider({
        authMethod: 'app',
        appId: 777777,
        appPrivateKey:
          '-----BEGIN RSA PRIVATE KEY-----\nOSS-PEM\n-----END RSA PRIVATE KEY-----',
        appInstallationId: 111222,
      });

      const resolver = await factory.build(provider);

      expect(resolver).toBeInstanceOf(AppInstallationTokenResolver);
    });

    it('throws when appId is missing on OSS', async () => {
      const factory = new GithubTokenResolverFactory(new StubConfig({}), 'oss');
      const provider = makeProvider({
        authMethod: 'app',
        appId: undefined,
        appPrivateKey: 'pem',
        appInstallationId: 111222,
      });

      await expect(factory.build(provider)).rejects.toThrow(
        /provider\.appId is missing/,
      );
    });

    it('throws when appPrivateKey is missing on OSS', async () => {
      const factory = new GithubTokenResolverFactory(new StubConfig({}), 'oss');
      const provider = makeProvider({
        authMethod: 'app',
        appId: 777777,
        appPrivateKey: undefined,
        appInstallationId: 111222,
      });

      await expect(factory.build(provider)).rejects.toThrow(
        /provider\.appPrivateKey is missing/,
      );
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
