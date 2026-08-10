import {
  TrackRepositoryCommand,
  TrackRepositoryResult,
} from '../../domain/useCases/trackRepository/ITrackRepositoryUseCase';
import {
  logErrorConsole,
  logInfoConsole,
  logSuccessConsole,
  formatCommand,
} from '../utils/consoleLogger';
import { handleTrackingError } from './trackingErrors';
import { ConfirmPromptFn, createTrackConfirm } from './trackingPrompts';

export type TrackRepositoryFunction = (
  command: TrackRepositoryCommand,
) => Promise<TrackRepositoryResult>;

export interface TrackHandlerDependencies {
  update: boolean;
  /** Explicit branch to track; the checked-out branch is used when omitted. */
  branch?: string;
  baseDirectory: string;
  trackRepository: TrackRepositoryFunction;
  isTTY?: boolean;
  confirmPrompt?: ConfirmPromptFn;
}

/**
 * Handler for the `track` command. Owns all user interaction (prompts + output)
 * and delegates orchestration to the TrackRepositoryUseCase.
 *
 * Removal lives in `untrack`, its own top-level command — matching the
 * `install`/`uninstall` and `login`/`logout` pairs — so there is no
 * mutually-exclusive flag combination to guard against here.
 */
export async function trackHandler(
  deps: TrackHandlerDependencies,
): Promise<void> {
  const isTTY = deps.isTTY ?? Boolean(process.stdin.isTTY);
  const confirm = createTrackConfirm({
    isTTY,
    confirmPrompt: deps.confirmPrompt,
  });

  let result: TrackRepositoryResult;
  try {
    result = await deps.trackRepository({
      repoPath: deps.baseDirectory,
      origin: 'track',
      update: deps.update,
      remove: false,
      branch: deps.branch,
      confirm,
    });
  } catch (error) {
    handleTrackingError(error);
    return;
  }

  switch (result.status) {
    case 'set':
      logSuccessConsole(
        `Packmind now tracks ${result.owner}/${result.repo} on branch ${result.branch}.`,
      );
      process.exit(0);
      return;
    case 'updated':
      logSuccessConsole(
        `Tracked branch for ${result.owner}/${result.repo} changed from ${result.fromBranch} to ${result.branch}.`,
      );
      process.exit(0);
      return;
    case 'cancelled':
      logInfoConsole('No changes made. The tracked branch is unchanged.');
      process.exit(0);
      return;
    // The desired state is already in place, whether or not --update was
    // passed, so both spellings succeed. Exit codes follow one rule: 0 when
    // the desired state holds, 1 when it cannot be reached.
    case 'already-tracked-same-branch':
      logInfoConsole(
        `Repository ${result.owner}/${result.repo} is already tracked on branch ${result.branch}.`,
      );
      process.exit(0);
      return;
    case 'already-tracked-other-branch':
      logErrorConsole(
        `Repository ${result.owner}/${result.repo} is already tracked on branch ${result.trackedBranch}. Run ${formatCommand(
          'packmind track --update',
        )} to move it to ${result.branch}.`,
      );
      process.exit(1);
      return;
    case 'nothing-tracked':
      logErrorConsole(
        `Nothing is tracked yet — run ${formatCommand('packmind init')} or ${formatCommand('packmind track')} to start tracking.`,
      );
      process.exit(1);
      return;
    default:
      // `removed` / `not-tracked` belong to `untrack`, which has its own handler.
      return;
  }
}
