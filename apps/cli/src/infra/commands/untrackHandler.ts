import { TrackRepositoryResult } from '../../domain/useCases/trackRepository/ITrackRepositoryUseCase';
import {
  logInfoConsole,
  logSuccessConsole,
  logWarningConsole,
} from '../utils/consoleLogger';
import { TrackRepositoryFunction } from './trackHandler';
import { handleTrackingError } from './trackingErrors';
import { ConfirmPromptFn, createTrackConfirm } from './trackingPrompts';

export interface UntrackHandlerDependencies {
  baseDirectory: string;
  trackRepository: TrackRepositoryFunction;
  isTTY?: boolean;
  confirmPrompt?: ConfirmPromptFn;
}

/**
 * Handler for the `untrack` command. Owns all user interaction and delegates
 * orchestration to the TrackRepositoryUseCase.
 *
 * The unit of tracking is the repository, so `untrack` takes no branch: it
 * removes whatever branch is currently tracked. The tracked branch still
 * appears in the output, but as *context* rather than as a scope.
 */
export async function untrackHandler(
  deps: UntrackHandlerDependencies,
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
      update: false,
      remove: true,
      confirm,
    });
  } catch (error) {
    handleTrackingError(error);
    return;
  }

  switch (result.status) {
    case 'removed':
      logSuccessConsole(
        `Packmind no longer tracks ${result.owner}/${result.repo}. Distributions recorded on branch ${result.branch} are kept and reappear if you track it again.`,
      );
      process.exit(0);
      return;
    case 'not-tracked':
      logWarningConsole(
        `Repository is not tracked in '${result.organizationName}' organization`,
      );
      process.exit(0);
      return;
    default:
      // Only `cancelled` can reach this: the use case returns the three
      // statuses above for the removal path.
      logInfoConsole('No changes made. The tracked branch is unchanged.');
      process.exit(0);
      return;
  }
}
