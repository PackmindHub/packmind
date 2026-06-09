import {
  GithubTokenResolverFactory,
  IConfigProvider,
  resolveGithubAppMode,
} from './GithubTokenResolverFactory';
import { PatTokenResolver } from './PatTokenResolver';
import { AppInstallationTokenResolver } from './AppInstallationTokenResolver';
import {
  GitHubAppRevokedError,
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
  'findActiveByOrganizationId' | 'findById'
> {
  constructor(
    private readonly result: OrganizationGitHubApp | null,
    private readonly findByIdResult: OrganizationGitHubApp | null = result,
  ) {}

  async findActiveByOrganizationId(): Promise<OrganizationGitHubApp | null> {
    return this.result;
  }

  async findById(): Promise<OrganizationGitHubApp | null> {
    return this.findByIdResult;
  }
}

describe('GithubTokenResolverFactory', () => {
  afterEach(() => jest.clearAllMocks());

  describe('authMethod = "token"', () => {
    describe('when provider.token is set', () => {
      let resolver: Awaited<ReturnType<GithubTokenResolverFactory['build']>>;

      beforeEach(async () => {
        const factory = new GithubTokenResolverFactory(
          new StubConfig({}),
          'shared',
        );
        const provider = makeProvider({
          authMethod: 'token',
          token: 'ghp_actual',
        });

        resolver = await factory.build(provider);
      });

      it('returns a PatTokenResolver', () => {
        expect(resolver).toBeInstanceOf(PatTokenResolver);
      });

      it('constructs the resolver with provider.token', async () => {
        await expect(resolver.getToken()).resolves.toBe('ghp_actual');
      });
    });

    describe('when token is empty', () => {
      it('throws', async () => {
        const factory = new GithubTokenResolverFactory(
          new StubConfig({}),
          'shared',
        );
        const provider = makeProvider({ authMethod: 'token', token: null });

        await expect(factory.build(provider)).rejects.toThrow(
          /provider\.token is empty/,
        );
      });
    });
  });

  describe('authMethod = "app", mode = "shared"', () => {
    it('reads GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY from config and returns AppInstallationTokenResolver', async () => {
      const config = new StubConfig({
        GITHUB_APP_ID: '123456',
        GITHUB_APP_PRIVATE_KEY:
          '-----BEGIN RSA PRIVATE KEY-----\nMOCK\n-----END RSA PRIVATE KEY-----',
      });
      const factory = new GithubTokenResolverFactory(config, 'shared');
      const provider = makeProvider({
        authMethod: 'app',
        appInstallationId: 987654,
      });

      const resolver = await factory.build(provider);

      expect(resolver).toBeInstanceOf(AppInstallationTokenResolver);
    });

    describe('when GITHUB_APP_ID is missing', () => {
      it('throws a clear error', async () => {
        const config = new StubConfig({
          GITHUB_APP_PRIVATE_KEY: 'pem',
        });
        const factory = new GithubTokenResolverFactory(config, 'shared');
        const provider = makeProvider({
          authMethod: 'app',
          appInstallationId: 987654,
        });

        await expect(factory.build(provider)).rejects.toThrow(
          /GITHUB_APP_ID is not configured/,
        );
      });
    });

    describe('when GITHUB_APP_PRIVATE_KEY is missing', () => {
      it('throws a clear error', async () => {
        const config = new StubConfig({
          GITHUB_APP_ID: '123456',
        });
        const factory = new GithubTokenResolverFactory(config, 'shared');
        const provider = makeProvider({
          authMethod: 'app',
          appInstallationId: 987654,
        });

        await expect(factory.build(provider)).rejects.toThrow(
          /GITHUB_APP_PRIVATE_KEY is not configured/,
        );
      });
    });

    describe('when appInstallationId is missing', () => {
      it('throws', async () => {
        const config = new StubConfig({
          GITHUB_APP_ID: '123456',
          GITHUB_APP_PRIVATE_KEY: 'pem',
        });
        const factory = new GithubTokenResolverFactory(config, 'shared');
        const provider = makeProvider({
          authMethod: 'app',
          appInstallationId: undefined,
        });

        await expect(factory.build(provider)).rejects.toThrow(
          /appInstallationId is missing/,
        );
      });
    });
  });

  describe('authMethod = "app", mode = "on-prem"', () => {
    it('looks up OrganizationGitHubApp by the provider FK and returns AppInstallationTokenResolver', async () => {
      const orgApp = makeOrgApp();
      const repo = new StubOrgGitHubAppRepository(null, orgApp);
      const factory = new GithubTokenResolverFactory(
        new StubConfig({}),
        'on-prem',
        undefined,
        repo as unknown as IOrganizationGitHubAppRepository,
      );
      const provider = makeProvider({
        authMethod: 'app',
        appInstallationId: 111222,
        organizationGitHubAppId: orgApp.id,
      });

      const resolver = await factory.build(provider);

      expect(resolver).toBeInstanceOf(AppInstallationTokenResolver);
    });

    describe('when the referenced App is revoked', () => {
      it('throws GitHubAppRevokedError', async () => {
        const orgApp = makeOrgApp({
          revokedAt: new Date('2026-05-01T00:00:00Z'),
        });
        const repo = new StubOrgGitHubAppRepository(null, orgApp);
        const factory = new GithubTokenResolverFactory(
          new StubConfig({}),
          'on-prem',
          undefined,
          repo as unknown as IOrganizationGitHubAppRepository,
        );
        const provider = makeProvider({
          authMethod: 'app',
          appInstallationId: 111222,
          organizationGitHubAppId: orgApp.id,
        });

        await expect(factory.build(provider)).rejects.toBeInstanceOf(
          GitHubAppRevokedError,
        );
      });
    });

    describe('when the referenced OrganizationGitHubApp does not exist', () => {
      it('throws', async () => {
        const repo = new StubOrgGitHubAppRepository(null, null);
        const factory = new GithubTokenResolverFactory(
          new StubConfig({}),
          'on-prem',
          undefined,
          repo as unknown as IOrganizationGitHubAppRepository,
        );
        const provider = makeProvider({
          authMethod: 'app',
          appInstallationId: 111222,
          organizationGitHubAppId: createOrganizationGitHubAppId('missing-app'),
        });

        await expect(factory.build(provider)).rejects.toThrow(
          /OrganizationGitHubApp missing-app not found/,
        );
      });
    });

    describe('when the GitProvider has no organizationGitHubAppId FK', () => {
      it('throws', async () => {
        const orgApp = makeOrgApp();
        const repo = new StubOrgGitHubAppRepository(null, orgApp);
        const factory = new GithubTokenResolverFactory(
          new StubConfig({}),
          'on-prem',
          undefined,
          repo as unknown as IOrganizationGitHubAppRepository,
        );
        const provider = makeProvider({
          authMethod: 'app',
          appInstallationId: 111222,
          organizationGitHubAppId: undefined,
        });

        await expect(factory.build(provider)).rejects.toThrow(
          /no organizationGitHubAppId/,
        );
      });
    });

    describe('when orgGitHubAppRepository is not provided', () => {
      it('throws', async () => {
        const factory = new GithubTokenResolverFactory(
          new StubConfig({}),
          'on-prem',
          undefined,
          null,
        );
        const provider = makeProvider({
          authMethod: 'app',
          appInstallationId: 111222,
          organizationGitHubAppId: createOrganizationGitHubAppId('app-1'),
        });

        await expect(factory.build(provider)).rejects.toThrow(
          /orgGitHubAppRepository is required for on-prem mode/,
        );
      });
    });
  });

  describe('mode inferred from GITHUB_APP_SLUG when no override is provided', () => {
    describe('when GITHUB_APP_SLUG is set', () => {
      it('uses shared mode and reads env-configured GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY', async () => {
        const config = new StubConfig({
          GITHUB_APP_SLUG: 'packmind-cloud',
          GITHUB_APP_ID: '123456',
          GITHUB_APP_PRIVATE_KEY:
            '-----BEGIN RSA PRIVATE KEY-----\nMOCK\n-----END RSA PRIVATE KEY-----',
        });
        const factory = new GithubTokenResolverFactory(config);
        const provider = makeProvider({
          authMethod: 'app',
          appInstallationId: 987654,
        });

        const resolver = await factory.build(provider);

        expect(resolver).toBeInstanceOf(AppInstallationTokenResolver);
      });
    });

    describe('when GITHUB_APP_SLUG is not set', () => {
      it('uses on-prem mode and reads OrganizationGitHubApp via FK', async () => {
        const orgApp = makeOrgApp();
        const repo = new StubOrgGitHubAppRepository(null, orgApp);
        const factory = new GithubTokenResolverFactory(
          new StubConfig({}),
          undefined,
          undefined,
          repo as unknown as IOrganizationGitHubAppRepository,
        );
        const provider = makeProvider({
          authMethod: 'app',
          appInstallationId: 111222,
          organizationGitHubAppId: orgApp.id,
        });

        const resolver = await factory.build(provider);

        expect(resolver).toBeInstanceOf(AppInstallationTokenResolver);
      });
    });
  });

  describe('resolveGithubAppMode', () => {
    describe('when GITHUB_APP_SLUG is set', () => {
      it('returns "shared"', async () => {
        await expect(
          resolveGithubAppMode(
            new StubConfig({ GITHUB_APP_SLUG: 'packmind-cloud' }),
          ),
        ).resolves.toBe('shared');
      });
    });

    describe('when GITHUB_APP_SLUG is not set', () => {
      it('returns "on-prem"', async () => {
        await expect(resolveGithubAppMode(new StubConfig({}))).resolves.toBe(
          'on-prem',
        );
      });
    });
  });
});
