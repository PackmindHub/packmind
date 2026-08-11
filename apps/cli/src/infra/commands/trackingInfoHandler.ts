import {
  GetTrackingInfoCommand,
  GetTrackingInfoResult,
} from '../../domain/useCases/trackRepository/IGetTrackingInfoUseCase';
import {
  formatCommand,
  logInfoConsole,
  logWarningConsole,
} from '../utils/consoleLogger';
import { handleTrackingError } from './trackingErrors';

export type GetTrackingInfoFunction = (
  command: GetTrackingInfoCommand,
) => Promise<GetTrackingInfoResult>;

export interface TrackingInfoHandlerDependencies {
  baseDirectory: string;
  getTrackingInfo: GetTrackingInfoFunction;
}

/**
 * Handler for the `git info` command. Reporting the state is the whole job, so
 * both outcomes exit 0 — "not tracked" is an answer, not a failure. Only being
 * unable to answer (no git remote, not logged in, no rights) exits 1.
 */
export async function trackingInfoHandler(
  deps: TrackingInfoHandlerDependencies,
): Promise<void> {
  let result: GetTrackingInfoResult;
  try {
    result = await deps.getTrackingInfo({ repoPath: deps.baseDirectory });
  } catch (error) {
    handleTrackingError(error);
    return;
  }

  if (result.status === 'not-tracked') {
    logInfoConsole(
      `${result.owner}/${result.repo} is not tracked in Packmind. Run ${formatCommand(
        'packmind git track',
      )} to track branch '${result.currentBranch}'.`,
    );
    process.exit(0);
    return;
  }

  logInfoConsole(
    `Packmind tracks ${result.owner}/${result.repo} on branch '${result.trackedBranch}'.`,
  );

  // Being on another branch is not an error, but it silently changes what gets
  // recorded — so it is called out rather than left for the user to spot.
  if (result.currentBranch !== result.trackedBranch) {
    logWarningConsole(
      `You are on '${result.currentBranch}', so distributions from here are not recorded. Run ${formatCommand(
        'packmind git track --update',
      )} to move tracking to '${result.currentBranch}'.`,
    );
  }

  process.exit(0);
}
