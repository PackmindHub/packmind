import * as path from 'path';

import { normalizePath } from '../../../application/utils/pathUtils';
import { findNearestConfigDir } from '../../../application/utils/findNearestConfigDir';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { IPlaybookLocalRepository } from '../../../domain/repositories/IPlaybookLocalRepository';
import { logErrorConsole, logSuccessConsole } from '../../utils/consoleLogger';

export type PlaybookUnstageHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  filePath: string | undefined;
  exit: (code: number) => void;
  getCwd: () => string;
  playbookLocalRepository: IPlaybookLocalRepository;
};

export async function playbookUnstageHandler(
  deps: PlaybookUnstageHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, filePath, exit, getCwd, playbookLocalRepository } =
    deps;

  if (!filePath) {
    logErrorConsole(
      'Missing file path. Usage: packmind playbook unstage <path>',
    );
    exit(1);
    return;
  }

  const absolutePath = path.resolve(getCwd(), filePath);
  const configDir = await findNearestConfigDir(absolutePath, packmindCliHexa);
  const normalizedFilePath = configDir
    ? normalizePath(path.relative(configDir, absolutePath))
    : normalizePath(filePath);

  const removed = playbookLocalRepository.removeChange(normalizedFilePath);

  if (!removed) {
    logErrorConsole(`No staged change found for ${normalizedFilePath}`);
    exit(1);
    return;
  }

  logSuccessConsole(`Unstaged ${normalizedFilePath} from playbook`);
  exit(0);
}
