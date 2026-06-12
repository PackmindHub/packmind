import type { GitProviderId } from '@packmind/types';
import type { PackageDrift, RepoRef } from '../types';
import { installDriftEntries } from './installDriftEntries';

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

export function behindInstallsRequiringCliCount(
  packages: PackageDrift[],
  providersWithToken: Set<GitProviderId>,
): number {
  let count = 0;
  for (const pkg of packages) {
    for (const entry of installDriftEntries(pkg)) {
      if (entry.behindArtifacts.length === 0) continue;
      if (!providersWithToken.has(entry.repo.providerId)) count++;
    }
  }
  return count;
}
