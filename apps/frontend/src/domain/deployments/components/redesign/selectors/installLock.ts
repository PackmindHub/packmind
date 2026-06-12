import { DistributionStatus, type GitProviderId } from '@packmind/types';
import type { InstallDriftEntry } from './installDriftEntries';

export type InstallLockReason = 'in-progress' | 'no-app-token';

export function installLockReason(
  entry: InstallDriftEntry,
  providersWithToken: Set<GitProviderId>,
  isProvidersLoading: boolean,
): InstallLockReason | null {
  if (entry.lastDistributionStatus === DistributionStatus.in_progress) {
    return 'in-progress';
  }
  if (!isProvidersLoading && !providersWithToken.has(entry.repo.providerId)) {
    return 'no-app-token';
  }
  return null;
}
