import { logErrorConsole } from '../../utils/consoleLogger';
import {
  stageSinglePath,
  StageSinglePathDependencies,
} from './add/stageSinglePath';

export type PlaybookAddHandlerDependencies = Omit<
  StageSinglePathDependencies,
  'filePath'
> & {
  filePath: string | undefined;
  exit: (code: number) => void;
};

export async function playbookAddHandler(
  deps: PlaybookAddHandlerDependencies,
): Promise<void> {
  const { filePath, exit, ...rest } = deps;

  if (!filePath) {
    logErrorConsole(
      'Missing file path. Usage: packmind-cli playbook add <path>',
    );
    exit(1);
    return;
  }

  const outcome = await stageSinglePath({ ...rest, filePath });

  if (outcome.status === 'failed') {
    logErrorConsole(outcome.message ?? `Failed to stage ${outcome.filePath}`);
    exit(1);
    return;
  }

  exit(0);
}
