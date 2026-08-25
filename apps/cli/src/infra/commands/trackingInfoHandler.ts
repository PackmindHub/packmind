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
import { EXEC_NAME } from '../utils/execName';

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
    // With a detached HEAD there is no branch to propose, so the command names
    // the flag that supplies one instead of offering to track `HEAD`.
    logInfoConsole(
      result.currentBranchDetached
        ? `${result.owner}/${result.repo} is not tracked in Packmind. No branch is checked out here — run ${formatCommand(
            `${EXEC_NAME} git track --branch <name>`,
          )} to track one.`
        : `${result.owner}/${result.repo} is not tracked in Packmind. Run ${formatCommand(
            `${EXEC_NAME} git track`,
          )} to track branch '${result.currentBranch}'.`,
    );
    process.exit(0);
    return;
  }

  logInfoConsole(
    `Packmind tracks ${result.owner}/${result.repo} on branch '${result.trackedBranch}'.`,
  );

  // Being off the tracked branch is not an error, but it silently changes what
  // gets recorded — so it is called out rather than left for the user to spot.
  if (result.currentBranch !== result.trackedBranch) {
    logWarningConsole(mismatchWarning(result));
  }

  process.exit(0);
}

/**
 * Why nothing gets recorded from here, worst cause first. A tracked branch that
 * is gone beats a branch mismatch: it records nothing for anybody, not just for
 * whoever is running the command. Both of its causes are named — telling
 * someone their branch was deleted when they are merely in a shallow or
 * single-branch clone would be wrong.
 *
 * Whether HEAD is detached decides the recovery in every case: `--update`
 * alone moves tracking to the checked-out branch, and there is none.
 */
function mismatchWarning(
  result: Extract<GetTrackingInfoResult, { status: 'tracked' }>,
): string {
  const moveTracking = result.currentBranchDetached
    ? `${formatCommand(`${EXEC_NAME} git track --update --branch <name>`)} to move tracking to a branch that exists`
    : `${formatCommand(`${EXEC_NAME} git track --update`)} to move tracking to '${result.currentBranch}'`;

  if (!result.trackedBranchExists) {
    return `Branch '${result.trackedBranch}' is not in this repository — deleted after a merge, or never fetched here — so no distribution is recorded anywhere. Run ${moveTracking}, or ${formatCommand(
      'git fetch',
    )} if the branch is still on the remote.`;
  }

  if (result.currentBranchDetached) {
    return `No branch is checked out here — HEAD is detached — so distributions from here are not recorded. Check '${result.trackedBranch}' out to record them, or run ${moveTracking}.`;
  }

  return `You are on '${result.currentBranch}', so distributions from here are not recorded. Run ${moveTracking}.`;
}
