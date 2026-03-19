import { IPlaybookLocalRepository } from '../../../domain/repositories/IPlaybookLocalRepository';
import { logErrorConsole, logSuccessConsole } from '../../utils/consoleLogger';

export type PlaybookUnstageHandlerDependencies = {
  filePath: string | undefined;
  exit: (code: number) => void;
  getCwd: () => string;
  playbookLocalRepository: IPlaybookLocalRepository;
};

function normalizePath(filePath: string): string {
  if (filePath.startsWith('./')) {
    return filePath.slice(2);
  }
  return filePath;
}

export async function playbookUnstageHandler(
  deps: PlaybookUnstageHandlerDependencies,
): Promise<void> {
  const { filePath, exit, playbookLocalRepository } = deps;

  if (!filePath) {
    logErrorConsole(
      'Missing file path. Usage: packmind playbook unstage <path>',
    );
    exit(1);
    return;
  }

  const normalizedFilePath = normalizePath(filePath);

  const removed = playbookLocalRepository.removeChange(normalizedFilePath);

  if (!removed) {
    logErrorConsole(`No staged change found for ${normalizedFilePath}`);
    exit(1);
    return;
  }

  logSuccessConsole(`Unstaged ${normalizedFilePath} from playbook`);
  exit(0);
}
