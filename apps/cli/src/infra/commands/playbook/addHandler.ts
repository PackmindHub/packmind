import {
  formatLabel,
  logErrorConsole,
  logInfoConsole,
} from '../../utils/consoleLogger';
import {
  stageSinglePath,
  StagePathOutcome,
  StageSinglePathDependencies,
} from './add/stageSinglePath';

export type PlaybookAddHandlerDependencies = Omit<
  StageSinglePathDependencies,
  'filePath'
> & {
  filePaths: string[];
  exit: (code: number) => void;
};

export async function playbookAddHandler(
  deps: PlaybookAddHandlerDependencies,
): Promise<void> {
  const { filePaths, exit, ...rest } = deps;

  if (filePaths.length === 0) {
    logErrorConsole(
      'No path provided. Usage: packmind-cli playbook add <paths...>',
    );
    exit(1);
    return;
  }

  const outcomes: StagePathOutcome[] = [];

  // Sequential on purpose: staging mutates the local playbook file and the lock
  // file, so running the paths concurrently would race on both.
  for (const filePath of filePaths) {
    const outcome = await stageSinglePath({ ...rest, filePath });
    outcomes.push(outcome);

    if (outcome.status === 'failed') {
      logErrorConsole(`${filePath}: ${outcome.message ?? 'failed to stage'}`);
    }
  }

  const failedCount = outcomes.filter((o) => o.status === 'failed').length;
  const stagedCount = outcomes.filter((o) => o.status === 'staged').length;

  if (filePaths.length > 1) {
    logInfoConsole(
      `${stagedCount} staged, ${failedCount} failed of ${filePaths.length}.`,
    );
  }

  if (stagedCount > 0) {
    logInfoConsole(
      `Run ${formatLabel('packmind playbook submit')} when you're ready to publish your changes.`,
    );
  }

  exit(failedCount > 0 ? 1 : 0);
}
