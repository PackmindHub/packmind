import { GitProvider } from '@packmind/types';

const DEFAULT_HOST_BY_SOURCE: Partial<Record<GitProvider['source'], string>> = {
  github: 'https://github.com',
  gitlab: 'https://gitlab.com',
};

/**
 * The URL of the instance a provider reaches. The GitHub API client always
 * targets github.com, whatever URL the provider stores, App installs
 * included; GitLab's falls back to gitlab.com when it stores none.
 */
export function providerHostUrl(
  provider: Pick<GitProvider, 'url' | 'source'>,
): string | null {
  if (provider.source === 'github') {
    return DEFAULT_HOST_BY_SOURCE.github ?? null;
  }
  return provider.url || DEFAULT_HOST_BY_SOURCE[provider.source] || null;
}
