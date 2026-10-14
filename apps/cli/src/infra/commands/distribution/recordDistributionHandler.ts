import * as path from 'path';
import {
  hasRecordedPackageVersions,
  PACKMIND_LOCK_FILE_NAME,
  PackmindLockFile,
} from '@packmind/types';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { IConfigFileRepository } from '../../../domain/repositories/IConfigFileRepository';
import { ILockFileRepository } from '../../../domain/repositories/ILockFileRepository';
import { parseOwnerRepo } from '../../../application/useCases/trackRepository/TrackRepositoryUseCase';
import {
  formatCommand,
  logConsole,
  logErrorConsole,
  logSuccessConsole,
} from '../../utils/consoleLogger';
import { EXEC_NAME } from '../../utils/execName';
import {
  decideDistributionTracking,
  DistributionTrackingDecision,
  reportLockFileWarnings,
  resolveTrackingLookup,
  toRepoRelativePath,
} from '../distributionTracking';

export interface RecordDistributionHandlerDependencies {
  baseDirectory: string;
  packmindCliHexa: Pick<
    PackmindCliHexa,
    | 'tryGetGitRepositoryRoot'
    | 'getGitRemoteUrlFromPath'
    | 'getCurrentBranch'
    | 'isDetachedHead'
    | 'branchExists'
    | 'getTrackedRepository'
    | 'notifyArtefactsDistribution'
    | 'listFilesNamed'
  >;
  lockFileRepository: Pick<ILockFileRepository, 'read'>;
  configFileRepository: Pick<IConfigFileRepository, 'readConfig'>;
  exit: (code: number) => void;
}

export async function recordDistributionHandler(
  deps: RecordDistributionHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, baseDirectory } = deps;

  const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(baseDirectory);
  if (!gitRoot) {
    logErrorConsole(
      'Nothing recorded: the current directory is not in a Git repository.',
    );
    deps.exit(1);
    return;
  }

  const locks = await findLocksRecordingVersions(deps);
  if (locks.length === 0) {
    logErrorConsole(
      `The current directory is not managed by Packmind: no packmind-lock.json here or below records package versions. Run ${formatCommand(
        `${EXEC_NAME} install`,
      )} to create one.`,
    );
    deps.exit(1);
    return;
  }

  const gitRemoteUrl = packmindCliHexa.getGitRemoteUrlFromPath(gitRoot);
  const gitBranch = packmindCliHexa.getCurrentBranch(gitRoot);
  const { owner, repo } = parseOwnerRepo(gitRemoteUrl);
  const decision = decideDistributionTracking({
    lookup: await resolveTrackingLookup(packmindCliHexa, owner, repo),
    currentBranch: gitBranch,
    branchExists: (branch) => {
      try {
        return packmindCliHexa.branchExists(gitRoot, branch);
      } catch {
        return true;
      }
    },
    detached: packmindCliHexa.isDetachedHead(gitRoot),
  });

  const refusal = refusalOf(decision, { owner, repo, gitBranch });
  if (refusal) {
    logErrorConsole(refusal);
    deps.exit(1);
    return;
  }

  let updatedCount = 0;
  for (const { directory, lockFile } of locks) {
    const relativePath = toRepoRelativePath(directory, gitRoot);
    const config = await deps.configFileRepository.readConfig(directory);
    try {
      const { status, warnings } =
        await packmindCliHexa.notifyArtefactsDistribution({
          gitRemoteUrl,
          gitBranch,
          relativePath,
          packmindLockFile: lockFile,
          packageVersions: config?.packages,
        });
      if (status === 'updated') {
        updatedCount++;
        logConsole(`${relativePath} recorded`);
      }
      reportLockFileWarnings(warnings, relativePath);
    } catch (error) {
      logErrorConsole(
        `Could not record ${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
      deps.exit(1);
      return;
    }
  }

  logSuccessConsole(
    `Distribution state recorded on '${gitBranch}': ${updatedCount} of ${locks.length} target${locks.length === 1 ? '' : 's'} updated.`,
  );
}

async function findLocksRecordingVersions(
  deps: RecordDistributionHandlerDependencies,
): Promise<{ directory: string; lockFile: PackmindLockFile }[]> {
  const locks: { directory: string; lockFile: PackmindLockFile }[] = [];
  const directories = deps.packmindCliHexa
    .listFilesNamed(deps.baseDirectory, PACKMIND_LOCK_FILE_NAME)
    .map((lockFilePath) => path.dirname(lockFilePath));
  for (const directory of directories) {
    const lockFile = await deps.lockFileRepository.read(directory);
    if (lockFile && hasRecordedPackageVersions(lockFile)) {
      locks.push({ directory, lockFile });
    }
  }
  return locks;
}

function refusalOf(
  decision: DistributionTrackingDecision,
  context: { owner: string; repo: string; gitBranch: string },
): string | null {
  switch (decision.action) {
    case 'record':
    case 'record-legacy':
      return null;
    case 'inform':
      return 'Nothing recorded: Packmind could not tell which branch it tracks for this repository. Check that you are logged in and try again.';
    case 'skip':
      if (decision.reason === 'repo_not_tracked') {
        return `Nothing recorded: ${context.owner}/${context.repo} is not tracked in Packmind. Ask an admin to run ${formatCommand(
          `${EXEC_NAME} git track`,
        )} to start tracking it.`;
      }
      if (decision.reason === 'detached_head') {
        return `Nothing recorded: no branch is checked out here (HEAD is detached), and the tracked branch is '${decision.trackedBranch}'.`;
      }
      if (decision.reason === 'tracked_branch_gone') {
        return `Nothing recorded: the tracked branch '${decision.trackedBranch}' is not in this repository.`;
      }
      return `Nothing recorded: the tracked branch is '${decision.trackedBranch}', and you are on '${context.gitBranch}'. Switch to '${decision.trackedBranch}' to record.`;
  }
}
