import { DistributionStatus, type GitProviderId } from '@packmind/types';
import type { InstallDriftEntry } from './installDriftEntries';
import { installDriftEntries } from './installDriftEntries';
import type { PackageDrift } from '../types';

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

/**
 * Dominant lock signal across a package's drifted installs, used by the rail
 * to flag packages the user can't act on from the app.
 *
 * - `all-no-app-token`: every drifted install is on a provider without a token.
 * - `all-in-progress`: every drifted install is mid-distribution.
 * - `none`: at least one drifted install is actionable from the app, or the
 *   package has no drift, or providers are still loading.
 */
export type PackageLockProfile =
  | 'all-no-app-token'
  | 'all-in-progress'
  | 'none';

export function packageLockProfile(
  pkg: PackageDrift,
  providersWithToken: Set<GitProviderId>,
  isProvidersLoading: boolean,
): PackageLockProfile {
  if (isProvidersLoading) return 'none';
  const drifted = installDriftEntries(pkg).filter(
    (e) => e.behindArtifacts.length > 0,
  );
  if (drifted.length === 0) return 'none';
  let allInProgress = true;
  let allNoToken = true;
  for (const entry of drifted) {
    const reason = installLockReason(entry, providersWithToken, false);
    if (reason !== 'in-progress') allInProgress = false;
    if (reason !== 'no-app-token') allNoToken = false;
  }
  if (allInProgress) return 'all-in-progress';
  if (allNoToken) return 'all-no-app-token';
  return 'none';
}
