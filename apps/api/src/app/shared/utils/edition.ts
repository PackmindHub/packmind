import { Configuration } from '@packmind/node-utils';
import { GithubAppMode } from '@packmind/types';

export type { GithubAppMode };

export type PackmindEdition = 'cloud' | 'oss';

export async function resolvePackmindEdition(): Promise<PackmindEdition> {
  const raw = await Configuration.getConfig('PACKMIND_EDITION');
  return raw === 'proprietary' || raw === 'cloud' ? 'cloud' : 'oss';
}

export async function resolveGithubAppMode(): Promise<GithubAppMode> {
  const slug = await Configuration.getConfig('GITHUB_APP_SLUG');
  return slug ? 'shared' : 'on-prem';
}
