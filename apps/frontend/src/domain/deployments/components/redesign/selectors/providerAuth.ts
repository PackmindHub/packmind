import type { GitProviderId } from '@packmind/types';
import type { RepoRef } from '../types';

type ProvidersResponse = {
  providers: Array<{ id: GitProviderId; hasAuth: boolean }>;
};

export function providersWithTokenSet(
  response: ProvidersResponse | undefined,
): Set<GitProviderId> {
  const set = new Set<GitProviderId>();
  if (!response) return set;
  for (const provider of response.providers) {
    if (provider.hasAuth) set.add(provider.id);
  }
  return set;
}

export function isAppDistributable(
  repo: RepoRef,
  providersWithToken: Set<GitProviderId>,
): boolean {
  return providersWithToken.has(repo.providerId);
}
