import { GitRepo, IPublicUseCase } from '@packmind/types';

/**
 * Whether the tracking operation is a first-time set, a deliberate branch move,
 * or a removal.
 */
export type TrackRepositoryMode = 'set' | 'update' | 'remove';

/**
 * Details surfaced to the caller so it can build a confirmation prompt.
 * The use case never prompts by itself — it delegates the decision to the
 * `confirm` callback provided in the command (business-only, no user output).
 */
export type TrackRepositoryConfirmation = {
  mode: TrackRepositoryMode;
  owner: string;
  repo: string;
  branch: string;
  /** The currently tracked branch — only present when `mode === 'update'`. */
  fromBranch?: string;
};

export type TrackRepositoryCommand = {
  /** Path to the git repository (used to derive owner/repo/branch). */
  repoPath: string;
  /** Where the tracking request originates from. */
  origin: 'init' | 'track';
  /** When true, move the tracked branch (requires something already tracked). */
  update: boolean;
  /** When true, remove tracking for the current repository. */
  remove: boolean;
  /**
   * Branch to track. Defaults to the branch currently checked out when omitted,
   * which is the common case — but making it explicit means tracking `main` no
   * longer requires checking `main` out first.
   */
  branch?: string;
  /**
   * Confirmation hook invoked before any mutation. Returning `false` cancels
   * the operation without changing anything.
   */
  confirm: (details: TrackRepositoryConfirmation) => Promise<boolean>;
};

/**
 * Outcome of a tracking attempt. Presentation (info vs warning vs error) is
 * left to each caller (track command vs init prompt) since expectations differ.
 */
export type TrackRepositoryResult =
  | {
      status: 'set';
      owner: string;
      repo: string;
      branch: string;
      gitRepo: GitRepo;
    }
  | {
      status: 'updated';
      owner: string;
      repo: string;
      branch: string;
      fromBranch: string;
      gitRepo: GitRepo;
    }
  | {
      status: 'already-tracked-same-branch';
      owner: string;
      repo: string;
      branch: string;
    }
  | {
      status: 'already-tracked-other-branch';
      owner: string;
      repo: string;
      branch: string;
      trackedBranch: string;
    }
  | {
      /**
       * No branch is checked out and none was requested, so there is nothing to
       * track: naming the branch is the caller's way out.
       */
      status: 'detached-head';
      owner: string;
      repo: string;
    }
  | {
      /** The requested branch does not exist in the local repository. */
      status: 'branch-not-found';
      owner: string;
      repo: string;
      branch: string;
    }
  | {
      status: 'nothing-tracked';
      owner: string;
      repo: string;
      branch: string;
    }
  | {
      status: 'removed';
      owner: string;
      repo: string;
      branch: string;
    }
  | {
      status: 'not-tracked';
      owner: string;
      repo: string;
      organizationName: string;
    }
  | { status: 'cancelled' };

export type ITrackRepositoryUseCase = IPublicUseCase<
  TrackRepositoryCommand,
  TrackRepositoryResult
>;
