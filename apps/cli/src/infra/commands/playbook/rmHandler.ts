import * as path from 'path';

import { findNearestConfigDir } from '../../../application/utils/findNearestConfigDir';
import { findLockFileEntryAndFileForPath } from '../../../application/utils/lockFileUtils';
import {
  normalizePath,
  resolveSkillDirPath,
} from '../../../application/utils/pathUtils';
import { resolveDeployedContext } from '../../../application/utils/resolveDeployedContext';
import { logErrorConsole, logSuccessConsole } from '../../utils/consoleLogger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { IPlaybookLocalRepository } from '../../../domain/repositories/IPlaybookLocalRepository';
import { ILockFileRepository } from '../../../domain/repositories/ILockFileRepository';

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

  // Resolve target directory and lock file first
  const targetDir = await findNearestConfigDir(
    path.dirname(absolutePath),
    packmindCliHexa,
  );
  if (!targetDir) {
    logErrorConsole(
      'Not inside a Packmind project. No packmind.json found in any parent directory.',
    );
    exit(1);
    return;
  }

  const lockFile = await lockFileRepository.read(targetDir);
  if (!lockFile) {
    logErrorConsole('This file was not distributed using packmind');
    exit(1);
    return;
  }

  const normalizedForLookup = normalizePath(
    path.relative(targetDir, absolutePath),
  );
  const lockResult = findLockFileEntryAndFileForPath(
    normalizedForLookup,
    lockFile.artifacts,
  );

  if (!lockResult) {
    logErrorConsole('This file was not distributed using packmind');
    exit(1);
    return;
  }

  const artifactType = lockResult.entry.type;
  const codingAgent = lockResult.file.agent;

  if (artifactType === 'skill' && isSkillSupportFile(absolutePath)) {
    logErrorConsole(
      'Cannot remove an individual skill file. Point to the skill folder to remove the full skill, or manually delete the file and run `packmind playbook add <skill-folder>/` to stage the change.',
    );
    exit(1);
    return;
  }

  const resolvedAbsolutePath =
    artifactType === 'skill' ? resolveSkillDirPath(absolutePath) : absolutePath;

  const normalizedFilePath = normalizePath(
    path.relative(targetDir, resolvedAbsolutePath),
  );

  // Re-lookup with resolved path for skills (directory vs file)
  const lockEntry =
    findLockFileEntryAndFileForPath(normalizedFilePath, lockFile.artifacts)
      ?.entry ?? lockResult.entry;
  if (!lockEntry) {
    logErrorConsole('This file was not distributed using packmind');
    exit(1);
    return;
  }

  const existingChange = playbookLocalRepository.getChange(
    normalizedFilePath,
    lockEntry.spaceId,
  );
  if (existingChange?.changeType === 'removed') {
    logSuccessConsole(`"${lockEntry.name}" is already staged for removal.`);
    exit(0);
    return;
  }

  const allSpaces = await packmindCliHexa.getSpaces();
  const matchingSpace = allSpaces.find((s) => s.id === lockEntry.spaceId);

  if (!matchingSpace) {
    logErrorConsole(
      `Cannot remove this ${lockEntry.type}: the space it belongs to is not available to you`,
    );
    exit(1);
    return;
  }

  const spaceName = matchingSpace.name;

  const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(targetDir);
  const configDir = gitRoot
    ? normalizePath(path.relative(gitRoot, targetDir))
    : '';

  const deployedContext = await resolveDeployedContext(
    packmindCliHexa,
    targetDir,
  );

  playbookLocalRepository.addChange({
    filePath: normalizedFilePath,
    artifactType: lockEntry.type,
    artifactName: lockEntry.name,
    codingAgent,
    configDir,
    changeType: 'removed',
    content: '',
    spaceId: lockEntry.spaceId,
    spaceName,
    targetId: deployedContext?.targetId ?? lockFile.targetId,
    addedAt: new Date().toISOString(),
  });

  const spaceInfo = spaceName ? ` in space "${spaceName}"` : '';
  logSuccessConsole(
    `Staged "${lockEntry.name}" (${lockEntry.type}, removed) to playbook${spaceInfo}`,
  );
  exit(0);
}
