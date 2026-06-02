import { GitHubAppRevokedError, GitProvider } from '@packmind/types';
import { Configuration } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import { IGithubTokenResolver } from '../../../../domain/repositories/IGithubTokenResolver';
import { IOrganizationGitHubAppRepository } from '../../../../domain/repositories/IOrganizationGitHubAppRepository';
import { PatTokenResolver } from './PatTokenResolver';
import { AppInstallationTokenResolver } from './AppInstallationTokenResolver';

const origin = 'GithubTokenResolverFactory';

/**
 * Edition flag used by the factory.
 *
 * Note: the env var `PACKMIND_EDITION` uses `'oss' | 'proprietary'`
 * across the rest of the codebase (see packages/llm/src/application/useCases/utils.ts).
 * This factory uses `'oss' | 'cloud'` internally because "cloud" is the name
 * in the GitHub App authentication plan and reads more naturally next to "oss".
 * The mapping is:
 *   - `PACKMIND_EDITION=oss`          → 'oss'
 *   - anything else (incl. 'proprietary' or unset) → 'cloud'
 */
export type PackmindEdition = 'oss' | 'cloud';

export type GithubTokenResolverFactoryBuildOpts = {
  /**
   * Optional callback invoked when the resolver detects a revoked credential
   * (e.g. on a 401 from GitHub). When omitted in the oss edition with an
   * App-installation provider, the factory registers a default that marks
   * `OrganizationGitHubApp.revokedAt` for the provider's organization.
   */
  onRevoke?: () => Promise<void>;
};

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
 * Contract:
 * - The `GitProvider` passed to `build()` MUST already be fully decrypted
 *   by `GitProviderRepository` — i.e. `token` is plaintext PAT and
 *   `appPrivateKey` is plaintext PEM. This factory will NOT decrypt anything.
 * - For `authMethod === 'token'`, returns a `PatTokenResolver` wrapping
 *   `provider.token`.
 * - For `authMethod === 'app'`:
 *   - on `'cloud'`, reads `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY`
 *     from the config port (env + Infisical), and uses
 *     `provider.appInstallationId` from the row.
 *   - on `'oss'`, reads `appId` and `appPrivateKey` from the active
 *     `OrganizationGitHubApp` record for the provider's organization, and uses
 *     `provider.appInstallationId` from the row.
 */
export class GithubTokenResolverFactory {
  constructor(
    private readonly config: IConfigProvider = {
      getConfig: (key) => Configuration.getConfig(key),
    },
    private readonly edition: PackmindEdition = resolveEdition(),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
    private readonly orgGitHubAppRepository: IOrganizationGitHubAppRepository | null = null,
  ) {
    this.logger.info('GithubTokenResolverFactory initialized', {
      edition: this.edition,
    });
  }

  async build(
    provider: GitProvider,
    opts: GithubTokenResolverFactoryBuildOpts = {},
  ): Promise<IGithubTokenResolver> {
    if (provider.authMethod === 'token') {
      if (!provider.token) {
        throw new Error(
          'GithubTokenResolverFactory: provider.authMethod is "token" but provider.token is empty',
        );
      }
      return new PatTokenResolver(provider.token);
    }

    if (provider.authMethod === 'app') {
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

      let appIdRaw: string | number | null | undefined;
      let privateKeyPem: string | null | undefined;
      let onRevoke: (() => Promise<void>) | undefined = opts.onRevoke;

      if (this.edition === 'cloud') {
        appIdRaw = await this.config.getConfig('GITHUB_APP_ID');
        privateKeyPem = await this.config.getConfig('GITHUB_APP_PRIVATE_KEY');

        if (!appIdRaw) {
          throw new Error(
            'GithubTokenResolverFactory: GITHUB_APP_ID is not configured (cloud edition)',
          );
        }
        if (!privateKeyPem) {
          throw new Error(
            'GithubTokenResolverFactory: GITHUB_APP_PRIVATE_KEY is not configured (cloud edition)',
          );
        }
      } else {
        // oss: read app credentials from the OrganizationGitHubApp record
        // referenced by the GitProvider's FK. Using a FK (not "the active App
        // for this org") binds each install to the App it was originally
        // installed against, so re-running the manifest never silently rebinds
        // old installations to a different App — that would 404 at JWT exchange.
        if (!this.orgGitHubAppRepository) {
          throw new Error(
            'GithubTokenResolverFactory: orgGitHubAppRepository is required for oss edition with app auth',
          );
        }

        if (!provider.organizationGitHubAppId) {
          throw new Error(
            `GithubTokenResolverFactory: provider ${provider.id} has authMethod 'app' but no organizationGitHubAppId (oss edition)`,
          );
        }

        const app = await this.orgGitHubAppRepository.findById(
          provider.organizationGitHubAppId,
        );

        if (!app) {
          throw new Error(
            `GithubTokenResolverFactory: OrganizationGitHubApp ${provider.organizationGitHubAppId} not found (oss edition)`,
          );
        }

        if (app.revokedAt) {
          throw new GitHubAppRevokedError(String(provider.id));
        }

        appIdRaw = app.appId;
        privateKeyPem = app.appPrivateKey;

        // Default onRevoke: when a 401 from GitHub flags the installation as
        // revoked, persist that on the OrganizationGitHubApp row so future
        // build() calls fail fast at the app.revokedAt check above instead
        // of minting another doomed JWT. Only on oss — cloud has no per-org
        // App record to mark.
        if (!onRevoke) {
          const orgGitHubAppRepository = this.orgGitHubAppRepository;
          const logger = this.logger;
          onRevoke = async () => {
            logger.warn('GitHub App installation revocation detected via 401', {
              providerId: provider.id,
              organizationId: provider.organizationId,
              organizationGitHubAppId: provider.organizationGitHubAppId,
            });
            await orgGitHubAppRepository.markRevoked(provider.organizationId);
          };
        }
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
        providerId: provider.id,
        edition: this.edition,
      });

      return new AppInstallationTokenResolver({
        providerId: provider.id,
        appId,
        privateKeyPem,
        installationId,
        onRevoke,
      });
    }

    throw new Error(
      `GithubTokenResolverFactory: unsupported authMethod "${String(provider.authMethod)}"`,
    );
  }
}

/**
 * Reads `PACKMIND_EDITION` once at construction and maps it to the
 * internal `'oss' | 'cloud'` flag. Anything that is not literally
 * `'oss'` is treated as `'cloud'` (the existing convention in
 * `packages/llm/src/application/useCases/utils.ts`).
 */
export function resolveEdition(
  env: NodeJS.ProcessEnv = process.env,
): PackmindEdition {
  return env.PACKMIND_EDITION === 'oss' ? 'oss' : 'cloud';
}
