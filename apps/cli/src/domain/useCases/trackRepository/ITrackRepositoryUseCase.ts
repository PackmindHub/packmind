import { GitRepo, IPublicUseCase } from '@packmind/types';

/**
 * Whether the tracking operation is a first-time set or a deliberate branch move.
 */
export type TrackRepositoryMode = 'set' | 'update';

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
      status: 'nothing-tracked';
      owner: string;
      repo: string;
      branch: string;
    }
  | { status: 'cancelled' };

export type ITrackRepositoryUseCase = IPublicUseCase<
  TrackRepositoryCommand,
  TrackRepositoryResult
>;
