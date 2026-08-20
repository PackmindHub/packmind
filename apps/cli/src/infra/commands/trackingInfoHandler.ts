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
    // A tracked branch nobody can check out again records nothing for anybody,
    // so it gets its own warning instead of the generic "you are elsewhere"
    // one. Both causes are named: telling someone their branch was deleted
    // when they are simply in a shallow or single-branch clone would be wrong.
    if (result.trackedBranchExists) {
      logWarningConsole(
        `You are on '${result.currentBranch}', so distributions from here are not recorded. Run ${formatCommand(
          'packmind git track --update',
        )} to move tracking to '${result.currentBranch}'.`,
      );
    } else {
      logWarningConsole(
        `Branch '${result.trackedBranch}' is not in this repository — deleted after a merge, or never fetched here — so no distribution is recorded anywhere. Run ${formatCommand(
          'packmind git track --update',
        )} to move tracking to '${result.currentBranch}', or ${formatCommand(
          'git fetch',
        )} if the branch is still on the remote.`,
      );
    }
  }

  process.exit(0);
}
