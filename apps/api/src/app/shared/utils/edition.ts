import { Configuration } from '@packmind/node-utils';
import { PackmindEdition } from '@packmind/types';

// Re-exported so existing importers keep their single import site. The type
// itself lives in @packmind/types because the CLI reads the same values off
// the Packmind-Edition response header.
export type { PackmindEdition };

export async function resolvePackmindEdition(): Promise<PackmindEdition> {
  const raw = await Configuration.getConfig('PACKMIND_EDITION');
  return raw === 'proprietary' || raw === 'cloud' ? 'cloud' : 'oss';
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
