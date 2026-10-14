import { LockFileSyncWarning } from '@packmind/types';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { logWarningConsole } from '../utils/consoleLogger';

type TrackingLookup =
  | { status: 'tracking-unsupported' }
  | { status: 'resolved'; trackedGitRepo: { branch: string } | null }
  | { status: 'unavailable' };

export type DistributionTrackingDecision =
  | { action: 'record' }
  | { action: 'record-legacy' }
  | { action: 'skip'; reason: 'repo_not_tracked' }
  | { action: 'skip'; reason: 'wrong_branch'; trackedBranch: string }
  | { action: 'skip'; reason: 'tracked_branch_gone'; trackedBranch: string }
  | { action: 'skip'; reason: 'detached_head'; trackedBranch: string }
  | { action: 'inform' };

export function decideDistributionTracking(params: {
  lookup: TrackingLookup;
  currentBranch: string;
  branchExists: (branch: string) => boolean;
  detached: boolean;
}): DistributionTrackingDecision {
  const { lookup, currentBranch, branchExists, detached } = params;

  switch (lookup.status) {
    case 'tracking-unsupported':
      return { action: 'record-legacy' };
    case 'unavailable':
      return { action: 'inform' };
    case 'resolved': {
      const tracked = lookup.trackedGitRepo;
      if (!tracked) {
        return { action: 'skip', reason: 'repo_not_tracked' };
      }
      if (tracked.branch !== currentBranch) {
        if (!branchExists(tracked.branch)) {
          return {
            action: 'skip',
            reason: 'tracked_branch_gone',
            trackedBranch: tracked.branch,
          };
        }
        return {
          action: 'skip',
          reason: detached ? 'detached_head' : 'wrong_branch',
          trackedBranch: tracked.branch,
        };
      }
      return { action: 'record' };
    }
  }
}

export function toRepoRelativePath(dir: string, gitRoot: string): string {
  let relativePath = dir.startsWith(gitRoot) ? dir.slice(gitRoot.length) : '/';
  if (!relativePath.startsWith('/')) {
    relativePath = '/' + relativePath;
  }
  if (!relativePath.endsWith('/')) {
    relativePath = relativePath + '/';
  }
  return relativePath;
}

export async function resolveTrackingLookup(
  packmindCliHexa: Pick<PackmindCliHexa, 'getTrackedRepository'>,
  owner: string,
  repo: string,
): Promise<TrackingLookup> {
  try {
    const { gitRepo } = await packmindCliHexa.getTrackedRepository({
      owner,
      repo,
    });
    return { status: 'resolved', trackedGitRepo: gitRepo };
  } catch (error) {
    const statusCode = (error as { statusCode?: number })?.statusCode;
    if (statusCode === 404) {
      return { status: 'tracking-unsupported' };
    }
    return { status: 'unavailable' };
  }
}

export function reportLockFileWarnings(
  warnings: LockFileSyncWarning[],
  relativePath: string,
): void {
  for (const warning of warnings) {
    if (warning.type === 'unknown_package') {
      logWarningConsole(
        `Distribution in ${relativePath}: '${warning.packageSlug}' is not a package of your organization, it was not recorded.`,
      );
    }
  }
}
