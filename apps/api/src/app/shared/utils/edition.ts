import { Configuration } from '@packmind/node-utils';

export type PackmindEdition = 'cloud' | 'oss';

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
