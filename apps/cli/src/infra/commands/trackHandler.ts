import { NotLoggedInError } from '../../domain/errors/NotLoggedInError';
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
import { ConfirmPromptFn, createTrackConfirm } from './trackingPrompts';

export type TrackRepositoryFunction = (
  command: TrackRepositoryCommand,
) => Promise<TrackRepositoryResult>;

export interface TrackHandlerDependencies {
  update: boolean;
  baseDirectory: string;
  trackRepository: TrackRepositoryFunction;
  isTTY?: boolean;
  confirmPrompt?: ConfirmPromptFn;
}

/**
 * Handler for the `track` command. Owns all user interaction (prompts + output)
 * and delegates orchestration to the TrackRepositoryUseCase.
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
      confirm,
    });
  } catch (error) {
    handleTrackError(error);
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
    case 'already-tracked-same-branch':
      if (deps.update) {
        logErrorConsole(
          `Repository ${result.owner}/${result.repo} is already tracked on branch ${result.branch}.`,
        );
        process.exit(1);
      } else {
        logInfoConsole(
          `Repository ${result.owner}/${result.repo} is already tracked on branch ${result.branch}.`,
        );
        process.exit(0);
      }
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
  }
}

function handleTrackError(error: unknown): void {
  if (error instanceof NotLoggedInError) {
    logErrorConsole(error.message);
    process.exit(1);
    return;
  }

  const statusCode = (error as { statusCode?: number })?.statusCode;
  if (statusCode === 404) {
    // Kill-switch: the feature flag is off for this user. Behave as feature-absent.
    logErrorConsole('Repository tracking is not available for your account.');
    process.exit(1);
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  logErrorConsole(message);
  process.exit(1);
}
