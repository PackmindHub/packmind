import { IPublicUseCase } from '@packmind/types';

export type GetTrackingInfoCommand = {
  /** Path to the git repository (used to derive owner/repo/branch). */
  repoPath: string;
};

/**
 * Read-only view of what Packmind tracks for the local repository. The current
 * branch is reported alongside the tracked one so the caller can tell whether
 * work done here is attributed to the tracked branch.
 */
export type GetTrackingInfoResult =
  | {
      status: 'tracked';
      owner: string;
      repo: string;
      trackedBranch: string;
      currentBranch: string;
      /**
       * Whether the tracked branch still exists locally. False after the branch
       * is deleted — a merged feature branch, typically — but also in a clone
       * that never fetched it, which is why callers word it as both.
       */
      trackedBranchExists: boolean;
    }
  | {
      status: 'not-tracked';
      owner: string;
      repo: string;
      currentBranch: string;
    };

export type IGetTrackingInfoUseCase = IPublicUseCase<
  GetTrackingInfoCommand,
  GetTrackingInfoResult
>;
