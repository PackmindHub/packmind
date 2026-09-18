import { GitHubAppRevokedError } from '@packmind/types';
import { Configuration } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import { IGithubTokenResolver } from '../../../../domain/repositories/IGithubTokenResolver';
import { GitProviderCredentials } from '../../../../domain/repositories/IGitProviderFactory';
import { IOrganizationGitHubAppRepository } from '../../../../domain/repositories/IOrganizationGitHubAppRepository';
import { PatTokenResolver } from './PatTokenResolver';
import { AppInstallationTokenResolver } from './AppInstallationTokenResolver';

const origin = 'GithubTokenResolverFactory';

/**
 * How long a built App resolver is reused. Building one resolves the hosting
 * mode, reads either two config values or an `OrganizationGitHubApp` row, and
 * mints an installation token on first use, so a burst of reads inside one
 * request should pay for that once.
 *
 * Deliberately short: `build()` is also where an on-prem App's revocation is
 * noticed, and a reused resolver does not re-check it, so the window bounds
 * how long a revoked App keeps working.
 */
const APP_RESOLVER_REUSE_MS = 60_000;

type CachedAppResolver = {
  resolver: IGithubTokenResolver;
  /**
   * The identity the resolver was built against. A provider re-pointed at
   * another installation or another App rebuilds at once rather than waiting
   * the window out.
   */
  identity: string;
  expiresAt: number;
};

/**
 * GitHub App hosting mode used by the factory.
 *
 * Distinct from Packmind's edition (oss vs proprietary): the proprietary
 * edition can run either Packmind-hosted (a single shared GitHub App, with
 * credentials in env vars) or on-prem (each organization registers its own
 * GitHub App via the manifest flow, same as OSS).
 *
 * The mode is inferred from the presence of `GITHUB_APP_SLUG`: set means
 * 'shared', absent means 'on-prem'.
 */
export type GithubAppMode = 'on-prem' | 'shared';

/**
 * Minimal config port — keeps the factory unit-testable without
 * binding to the real `Configuration` singleton.
 */
export interface IConfigProvider {
  getConfig(key: string): Promise<string | null>;
}

/**
 * Resolves which `IGithubTokenResolver` to use for a given GitProvider row.
 *
 * Decrypts nothing: credentials must arrive in plaintext, `provider.token`
 * from `GitProviderRepository` and an on-prem App's `appPrivateKey` from
 * `OrganizationGitHubAppRepository`.
 */
export class GithubTokenResolverFactory {
  /**
   * Built App resolvers, by provider. Only App auth is kept: a
   * `PatTokenResolver` costs nothing to build, and reusing one would keep
   * handing out a token that has since been rotated.
   */
  private readonly appResolvers = new Map<string, CachedAppResolver>();

  constructor(
    private readonly config: IConfigProvider = {
      getConfig: (key) => Configuration.getConfig(key),
    },
    private readonly modeOverride: GithubAppMode | undefined = undefined,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
    private readonly orgGitHubAppRepository: IOrganizationGitHubAppRepository | null = null,
  ) {
    this.logger.info('GithubTokenResolverFactory initialized', {
      modeOverride: this.modeOverride ?? null,
    });
  }

  async build(provider: GitProviderCredentials): Promise<IGithubTokenResolver> {
    if (provider.authMethod === 'token') {
      if (!provider.token) {
        throw new Error(
          'GithubTokenResolverFactory: provider.authMethod is "token" but provider.token is empty',
        );
      }
      return new PatTokenResolver(provider.token);
    }

    if (provider.authMethod === 'app') {
      // App auth mints its installation token against the provider's identity,
      // so unlike token auth it cannot run on a candidate that has not been
      // persisted yet.
      const providerId = provider.id;
      if (!providerId) {
        throw new Error(
          'GithubTokenResolverFactory: provider.authMethod is "app" but the provider has not been saved yet',
        );
      }

      const installationIdRaw = provider.appInstallationId;
      if (installationIdRaw === undefined || installationIdRaw === null) {
        throw new Error(
          'GithubTokenResolverFactory: provider.authMethod is "app" but provider.appInstallationId is missing',
        );
      }
      const installationId = Number(installationIdRaw);
      if (!Number.isInteger(installationId) || installationId <= 0) {
        throw new Error(
          'GithubTokenResolverFactory: provider.appInstallationId must be a positive integer',
        );
      }

      // Everything below this point is a read — of config, or of the
      // OrganizationGitHubApp row — followed by a resolver that will mint a
      // token. A live one for the same identity answers all of it.
      const identity = `${installationId}:${provider.organizationGitHubAppId ?? ''}`;
      const cached = this.appResolvers.get(providerId);
      if (
        cached &&
        cached.identity === identity &&
        Date.now() < cached.expiresAt
      ) {
        return cached.resolver;
      }

      const mode = await this.resolveMode();

      let appIdRaw: string | number | null | undefined;
      let privateKeyPem: string | null | undefined;

      if (mode === 'shared') {
        appIdRaw = await this.config.getConfig('GITHUB_APP_ID');
        privateKeyPem = await this.config.getConfig('GITHUB_APP_PRIVATE_KEY');

        if (!appIdRaw) {
          throw new Error(
            'GithubTokenResolverFactory: GITHUB_APP_ID is not configured (shared mode)',
          );
        }
        if (!privateKeyPem) {
          throw new Error(
            'GithubTokenResolverFactory: GITHUB_APP_PRIVATE_KEY is not configured (shared mode)',
          );
        }
      } else {
        // Keyed on the GitProvider's FK rather than "the active App for this
        // org", so each installation stays bound to the App it was installed
        // against: re-running the manifest would otherwise rebind old
        // installations to a new App and 404 at JWT exchange.
        if (!this.orgGitHubAppRepository) {
          throw new Error(
            'GithubTokenResolverFactory: orgGitHubAppRepository is required for on-prem mode with app auth',
          );
        }

        if (!provider.organizationGitHubAppId) {
          throw new Error(
            `GithubTokenResolverFactory: provider ${providerId} has authMethod 'app' but no organizationGitHubAppId (on-prem mode)`,
          );
        }

        const app = await this.orgGitHubAppRepository.findById(
          provider.organizationGitHubAppId,
        );

        if (!app) {
          throw new Error(
            `GithubTokenResolverFactory: OrganizationGitHubApp ${provider.organizationGitHubAppId} not found (on-prem mode)`,
          );
        }

        if (app.revokedAt) {
          throw new GitHubAppRevokedError(String(providerId));
        }

        appIdRaw = app.appId;
        privateKeyPem = app.appPrivateKey;
      }

      const appId = Number(appIdRaw);
      if (!Number.isInteger(appId) || appId <= 0) {
        throw new Error(
          'GithubTokenResolverFactory: appId must be a positive integer',
        );
      }

      if (!privateKeyPem) {
        throw new Error('GithubTokenResolverFactory: appPrivateKey is missing');
      }

      this.logger.info('Building AppInstallationTokenResolver', {
        providerId,
        mode,
      });

      const resolver = new AppInstallationTokenResolver({
        providerId,
        appId,
        privateKeyPem,
        installationId,
      });

      this.appResolvers.set(providerId, {
        resolver,
        identity,
        expiresAt: Date.now() + APP_RESOLVER_REUSE_MS,
      });

      return resolver;
    }

    throw new Error(
      `GithubTokenResolverFactory: unsupported authMethod "${String(provider.authMethod)}"`,
    );
  }

  private async resolveMode(): Promise<GithubAppMode> {
    if (this.modeOverride !== undefined) {
      return this.modeOverride;
    }
    const slug = await this.config.getConfig('GITHUB_APP_SLUG');
    return slug ? 'shared' : 'on-prem';
  }
}
