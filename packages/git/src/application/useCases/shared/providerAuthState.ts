import { GitProvider } from '@packmind/types';

/**
 * Whether a git provider has usable credentials (PAT or active GitHub App
 * installation). Providers without auth are CLI-managed: they are created as a
 * side-effect of `packmind-cli` pull sessions and are not configurable from
 * the settings UI.
 */
export function providerHasAuth(
  provider: Pick<
    GitProvider,
    'token' | 'authMethod' | 'appInstallationId' | 'revokedAt'
  >,
): boolean {
  const hasPatToken =
    provider.token !== null &&
    provider.token !== undefined &&
    provider.token.length > 0;
  // TypeORM returns the `bigint` app_installation_id column as a string, so
  // check presence instead of `typeof === 'number'`.
  const hasActiveAppInstallation =
    provider.authMethod === 'app' &&
    provider.appInstallationId !== undefined &&
    provider.appInstallationId !== null &&
    !provider.revokedAt;

  return hasPatToken || hasActiveAppInstallation;
}
