import { Configuration } from '@packmind/node-utils';
import { editionFromDeploymentValue, PackmindEdition } from '@packmind/types';

// Lives in @packmind/types because the CLI reads the same values off the
// Packmind-Edition header; re-exported so importers here keep one import site.
export type { PackmindEdition };

export async function resolvePackmindEdition(): Promise<PackmindEdition> {
  return editionFromDeploymentValue(
    await Configuration.getConfig('PACKMIND_EDITION'),
  );
}

// Hosting mode for the GitHub App integration. Distinct from edition: the
// proprietary edition can run either Packmind-hosted (shared App via
// GITHUB_APP_SLUG/GITHUB_APP_ID/GITHUB_APP_PRIVATE_KEY) or on-prem (each org
// registers its own App via the manifest flow, same as OSS).
export type GithubAppMode = 'shared' | 'on-prem';

export async function resolveGithubAppMode(): Promise<GithubAppMode> {
  const slug = await Configuration.getConfig('GITHUB_APP_SLUG');
  return slug ? 'shared' : 'on-prem';
}
