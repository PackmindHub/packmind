import { GitProvider } from '@packmind/types';

const DEFAULT_HOST_BY_SOURCE: Partial<Record<GitProvider['source'], string>> = {
  github: 'https://github.com',
  gitlab: 'https://gitlab.com',
};

/**
 * The URL of the instance a provider reaches. GitHub providers, App installs
 * included, may store no URL: their API client always targets github.com, as
 * GitLab's falls back to gitlab.com.
 */
export function providerHostUrl(
  provider: Pick<GitProvider, 'url' | 'source'>,
): string | null {
  return provider.url || DEFAULT_HOST_BY_SOURCE[provider.source] || null;
}
