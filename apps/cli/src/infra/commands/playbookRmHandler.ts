import * as path from 'path';

import { resolveArtefactFromPath } from '../../application/utils/resolveArtefactFromPath';
import { findNearestConfigDir } from '../../application/utils/findNearestConfigDir';
import { findLockFileEntryForPath } from '../../application/utils/lockFileUtils';
import { normalizePath } from '../../application/utils/pathUtils';
import { logErrorConsole, logSuccessConsole } from '../utils/consoleLogger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { IPlaybookLocalRepository } from '../../domain/repositories/IPlaybookLocalRepository';
import { ILockFileRepository } from '../../domain/repositories/ILockFileRepository';

export type PlaybookRmHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  filePath: string | undefined;
  exit: (code: number) => void;
  getCwd: () => string;
  playbookLocalRepository: IPlaybookLocalRepository;
  lockFileRepository: ILockFileRepository;
};

function isSkillSupportFile(absolutePath: string): boolean {
  const normalized = absolutePath.replace(/\\/g, '/');
  const skillDirMatch = normalized.match(/\/skills\/[^/]+\//);
  if (!skillDirMatch) return false;
  const afterSkillDir = normalized.substring(
    (skillDirMatch.index ?? 0) + skillDirMatch[0].length,
  );
  if (!afterSkillDir) return false;
  return afterSkillDir !== 'SKILL.md';
}

function resolveSkillDirPath(absolutePath: string): string {
  if (absolutePath.endsWith('SKILL.md')) {
    return path.dirname(absolutePath);
  }
  return absolutePath;
}

export async function playbookRmHandler(
  deps: PlaybookRmHandlerDependencies,
): Promise<void> {
  const {
    packmindCliHexa,
    filePath,
    exit,
    getCwd,
    playbookLocalRepository,
    lockFileRepository,
  } = deps;

  if (!filePath) {
    logErrorConsole(
      'Missing file path. Usage: packmind-cli playbook rm <path>',
    );
    exit(1);
    return;
  }

  const absolutePath = path.resolve(getCwd(), filePath);

  const artefactResult = resolveArtefactFromPath(absolutePath);
  if (!artefactResult) {
    logErrorConsole(
      `Unsupported file path: ${absolutePath}. File must be in a recognized artefact directory (command, standard, or skill).`,
    );
    exit(1);
    return;
  }

  const { artifactType, codingAgent } = artefactResult;

  if (artifactType === 'skill' && isSkillSupportFile(absolutePath)) {
    logErrorConsole(
      'Cannot remove an individual skill file. Point to the skill folder to remove the full skill, or manually delete the file and run `packmind playbook add <skill-folder>/` to stage the change.',
    );
    exit(1);
    return;
  }

  const resolvedAbsolutePath =
    artifactType === 'skill' ? resolveSkillDirPath(absolutePath) : absolutePath;

  const fileDir = path.dirname(resolvedAbsolutePath);

  const targetDir = await findNearestConfigDir(fileDir, packmindCliHexa);
  if (!targetDir) {
    logErrorConsole(
      'Not inside a Packmind project. No packmind.json found in any parent directory.',
    );
    exit(1);
    return;
  }

  const normalizedFilePath = normalizePath(
    path.relative(targetDir, resolvedAbsolutePath),
  );

  const lockFile = await lockFileRepository.read(targetDir);
  if (!lockFile) {
    logErrorConsole('This file was not distributed using packmind');
    exit(1);
    return;
  }

  const lockEntry = findLockFileEntryForPath(
    normalizedFilePath,
    lockFile.artifacts,
  );
  if (!lockEntry) {
    logErrorConsole('This file was not distributed using packmind');
    exit(1);
    return;
  }

  playbookLocalRepository.addChange({
    filePath: normalizedFilePath,
    artifactType: lockEntry.type,
    artifactName: lockEntry.name,
    codingAgent,
    changeType: 'removed',
    content: '',
    spaceId: lockEntry.spaceId,
    targetId: lockFile.targetId,
    addedAt: new Date().toISOString(),
  });

  logSuccessConsole(
    `Staged "${lockEntry.name}" (${lockEntry.type}, removed) to playbook.`,
  );
  exit(0);
}
