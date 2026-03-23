import * as path from 'path';

import { normalizePath } from '../../../application/utils/pathUtils';
import { findNearestConfigDir } from '../../../application/utils/findNearestConfigDir';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { IPlaybookLocalRepository } from '../../../domain/repositories/IPlaybookLocalRepository';
import { logErrorConsole, logSuccessConsole } from '../../utils/consoleLogger';

export type PlaybookUnstageHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  filePath: string | undefined;
  spaceSlug: string | undefined;
  exit: (code: number) => void;
  getCwd: () => string;
  playbookLocalRepository: IPlaybookLocalRepository;
};

export async function playbookUnstageHandler(
  deps: PlaybookUnstageHandlerDependencies,
): Promise<void> {
  const {
    packmindCliHexa,
    filePath,
    spaceSlug,
    exit,
    getCwd,
    playbookLocalRepository,
  } = deps;

  if (!filePath) {
    logErrorConsole(
      'Missing file path. Usage: packmind playbook unstage <path>',
    );
    exit(1);
    return;
  }

  const absolutePath = path.resolve(getCwd(), filePath);
  const configDir = await findNearestConfigDir(
    path.dirname(absolutePath),
    packmindCliHexa,
  );
  const normalizedFilePath = configDir
    ? normalizePath(path.relative(configDir, absolutePath))
    : normalizePath(filePath);

  const matchingEntries = playbookLocalRepository
    .getChanges()
    .filter((c) => c.filePath === normalizedFilePath);

  if (matchingEntries.length === 0) {
    logErrorConsole(`No staged change found for ${normalizedFilePath}`);
    exit(1);
    return;
  }

  if (spaceSlug) {
    const entry = matchingEntries.find(
      (c) => c.spaceName === spaceSlug || c.spaceId === spaceSlug,
    );
    if (!entry) {
      logErrorConsole(
        `No staged change found for ${normalizedFilePath} in space "${spaceSlug}"`,
      );
      exit(1);
      return;
    }
    playbookLocalRepository.removeChange(normalizedFilePath, entry.spaceId);
    logSuccessConsole(
      `Unstaged ${normalizedFilePath} from playbook (space: ${spaceSlug})`,
    );
    exit(0);
    return;
  }

  if (matchingEntries.length > 1) {
    const spaceList = matchingEntries
      .map(
        (c) =>
          `  ${c.spaceName ?? c.spaceId}${c.spaceName ? ` (${c.spaceId})` : ''}`,
      )
      .join('\n');
    logErrorConsole(
      `Multiple staged entries for ${normalizedFilePath}. Use --space to specify which one:\n${spaceList}`,
    );
    exit(1);
    return;
  }

  playbookLocalRepository.removeChange(
    normalizedFilePath,
    matchingEntries[0].spaceId,
  );
  logSuccessConsole(`Unstaged ${normalizedFilePath} from playbook`);
  exit(0);
}
