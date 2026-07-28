import {
  GitHubAppRevokedError,
  GitProvider,
  GithubAppMode,
} from '@packmind/types';
import { Configuration } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import { IGithubTokenResolver } from '../../../../domain/repositories/IGithubTokenResolver';
import { IOrganizationGitHubAppRepository } from '../../../../domain/repositories/IOrganizationGitHubAppRepository';
import { PatTokenResolver } from './PatTokenResolver';
import { AppInstallationTokenResolver } from './AppInstallationTokenResolver';

const origin = 'GithubTokenResolverFactory';

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
 *   - in `'shared'` mode, reads `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY`
 *     from the config port (env + Infisical), and uses
 *     `provider.appInstallationId` from the row.
 *   - in `'on-prem'` mode, reads `appId` and `appPrivateKey` from the
 *     `OrganizationGitHubApp` record referenced by `provider.organizationGitHubAppId`,
 *     and uses `provider.appInstallationId` from the row.
 */
export class GithubTokenResolverFactory {
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

  async build(provider: GitProvider): Promise<IGithubTokenResolver> {
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
        // on-prem: read app credentials from the OrganizationGitHubApp record
        // referenced by the GitProvider's FK. Using a FK (not "the active App
        // for this org") binds each install to the App it was originally
        // installed against, so re-running the manifest never silently rebinds
        // old installations to a different App — that would 404 at JWT exchange.
        if (!this.orgGitHubAppRepository) {
          throw new Error(
            'GithubTokenResolverFactory: orgGitHubAppRepository is required for on-prem mode with app auth',
          );
        }

        if (!provider.organizationGitHubAppId) {
          throw new Error(
            `GithubTokenResolverFactory: provider ${provider.id} has authMethod 'app' but no organizationGitHubAppId (on-prem mode)`,
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
          throw new GitHubAppRevokedError(String(provider.id));
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
        providerId: provider.id,
        mode,
      });

      return new AppInstallationTokenResolver({
        providerId: provider.id,
        appId,
        privateKeyPem,
        installationId,
      });
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

/**
 * Reads `GITHUB_APP_SLUG` from the given config port and maps presence to mode.
 * Exported for callers that want to share the same decision (e.g. the API layer
 * exposing the mode to the frontend).
 */
export async function resolveGithubAppMode(
  config: IConfigProvider = {
    getConfig: (key) => Configuration.getConfig(key),
  },
): Promise<GithubAppMode> {
  const slug = await config.getConfig('GITHUB_APP_SLUG');
  return slug ? 'shared' : 'on-prem';
}
