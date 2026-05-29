import { GitProvider } from '@packmind/types';
import { Configuration } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import { IGithubTokenResolver } from '../../../../domain/repositories/IGithubTokenResolver';
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
   * (e.g. on a 401 from GitHub). Wired in step 6.
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
 *   - on `'oss'`, reads `provider.appId`, `provider.appPrivateKey`,
 *     and `provider.appInstallationId` directly from the row.
 */
export class GithubTokenResolverFactory {
  constructor(
    private readonly config: IConfigProvider = {
      getConfig: (key) => Configuration.getConfig(key),
    },
    private readonly edition: PackmindEdition = resolveEdition(),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
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
        // oss: read app credentials directly from the provider row
        appIdRaw = provider.appId ?? null;
        privateKeyPem = provider.appPrivateKey ?? null;

        if (appIdRaw === undefined || appIdRaw === null) {
          throw new Error(
            'GithubTokenResolverFactory: provider.appId is missing (oss edition)',
          );
        }
        if (!privateKeyPem) {
          throw new Error(
            'GithubTokenResolverFactory: provider.appPrivateKey is missing (oss edition)',
          );
        }
      }

      const appId = Number(appIdRaw);
      if (!Number.isInteger(appId) || appId <= 0) {
        throw new Error(
          'GithubTokenResolverFactory: appId must be a positive integer',
        );
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
        onRevoke: opts.onRevoke,
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
