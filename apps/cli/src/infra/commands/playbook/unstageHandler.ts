import * as path from 'path';

import {
  normalizePath,
  resolveSkillDirPath,
} from '../../../application/utils/pathUtils';
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

  const cwd = getCwd();
  const absolutePath = path.resolve(cwd, filePath);
  const resolvedPath = resolveSkillDirPath(absolutePath);
  const configDir = await findNearestConfigDir(
    path.dirname(resolvedPath),
    packmindCliHexa,
  );
  if (!configDir) {
    logErrorConsole(
      'Not inside a Packmind project. No packmind.json found in any parent directory.',
    );
    exit(1);
    return;
  }

  // Use git root as base so cross-target paths resolve correctly.
  // Entries stored by `add` combine configDir (relative to git root) + filePath (relative to target).
  const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(cwd);
  const baseDir = gitRoot ?? configDir;
  const normalizedFilePath = normalizePath(
    path.relative(baseDir, resolvedPath),
  );

  const matchingEntries = playbookLocalRepository.getChanges().filter((c) => {
    const fullEntryPath = c.configDir
      ? normalizePath(path.join(c.configDir, c.filePath))
      : c.filePath;
    return fullEntryPath === normalizedFilePath;
  });

  if (matchingEntries.length === 0) {
    logErrorConsole(`No staged change found for ${normalizedFilePath}`);
    exit(1);
    return;
  }

  if (spaceSlug) {
    const normalizedSlug = spaceSlug.startsWith('@')
      ? spaceSlug.slice(1)
      : spaceSlug;
    const entry = matchingEntries.find(
      (c) => c.spaceName === normalizedSlug || c.spaceId === normalizedSlug,
    );
    if (!entry) {
      logErrorConsole(
        `No staged change found for ${normalizedFilePath} in space "${spaceSlug}"`,
      );
      exit(1);
      return;
    }
    playbookLocalRepository.removeChange(entry.filePath, entry.spaceId);
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
    matchingEntries[0].filePath,
    matchingEntries[0].spaceId,
  );
  logSuccessConsole(`Unstaged ${normalizedFilePath} from playbook`);
  exit(0);
}
