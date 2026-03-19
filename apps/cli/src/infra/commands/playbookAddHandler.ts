import * as path from 'path';
import * as yaml from 'yaml';

import { resolveArtefactFromPath } from '../../application/utils/resolveArtefactFromPath';
import { parseCommandFile } from '../../application/utils/parseCommandFile';
import { parseStandardMdForAgent } from '../../application/utils/parseStandardMd';
import { parseLenientStandard } from '../../application/utils/parseLenientStandard';
import { parseSkillDirectory } from '../../application/utils/parseSkillDirectory';
import { findNearestConfigDir } from '../../application/utils/findNearestConfigDir';
import { resolveDeployedContext } from '../../application/utils/resolveDeployedContext';
import {
  formatLabel,
  logErrorConsole,
  logInfoConsole,
  logSuccessConsole,
} from '../utils/consoleLogger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { IPlaybookLocalRepository } from '../../domain/repositories/IPlaybookLocalRepository';
import { ILockFileRepository } from '../../domain/repositories/ILockFileRepository';
import { normalizePath } from '../../application/utils/pathUtils';
import { ArtifactVersionEntry, FileModification, Space } from '@packmind/types';
import { PackmindLockFile } from '../../domain/repositories/PackmindLockFile';
import { findLockFileEntryForPath } from '../../application/utils/lockFileUtils';

type SkillFile = {
  path: string;
  relativePath: string;
  content: string;
  size: number;
  permissions: string;
  isBase64: boolean;
};

export type PlaybookAddHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  filePath: string | undefined;
  spaceSlug?: string;
  exit: (code: number) => void;
  getCwd: () => string;
  readFile: (path: string) => string;
  readSkillDirectory: (dirPath: string) => Promise<SkillFile[]>;
  playbookLocalRepository: IPlaybookLocalRepository;
  lockFileRepository: ILockFileRepository;
};

type StageRemovedDependencies = {
  packmindCliHexa: PackmindCliHexa;
  lockFileRepository: ILockFileRepository;
  playbookLocalRepository: IPlaybookLocalRepository;
  codingAgent: string;
  exit: (code: number) => void;
};

async function tryStageRemovedFromLockFile(
  resolvedPath: string,
  deps: StageRemovedDependencies,
): Promise<boolean> {
  const fileDir = path.dirname(resolvedPath);
  const targetDir = await findNearestConfigDir(fileDir, deps.packmindCliHexa);
  if (!targetDir) return false;

  const lockFile = await deps.lockFileRepository.read(targetDir);
  if (!lockFile) return false;

  const normalizedPath = normalizePath(path.relative(targetDir, resolvedPath));
  const lockEntry = findLockFileEntryForPath(
    normalizedPath,
    lockFile.artifacts,
  );
  if (!lockEntry) return false;

  const deployedContext = await resolveDeployedContext(
    deps.packmindCliHexa,
    targetDir,
  );
  deps.playbookLocalRepository.addChange({
    filePath: normalizedPath,
    artifactType: lockEntry.type,
    artifactName: lockEntry.name,
    codingAgent: deps.codingAgent,
    changeType: 'removed',
    content: '',
    spaceId: lockEntry.spaceId,
    targetId: deployedContext?.targetId,
    addedAt: new Date().toISOString(),
  });
  logSuccessConsole(
    `Staged "${lockEntry.name}" (${lockEntry.type}, removed) to playbook.`,
  );
  deps.exit(0);
  return true;
}

async function fetchDeployedArtifactFiles(
  packmindCliHexa: PackmindCliHexa,
  lockFile: PackmindLockFile,
): Promise<FileModification[]> {
  try {
    const artifacts: ArtifactVersionEntry[] = Object.values(
      lockFile.artifacts,
    ).map((entry) => ({
      name: entry.name,
      type: entry.type,
      id: entry.id,
      version: entry.version,
      spaceId: entry.spaceId,
    }));
    const response = await packmindCliHexa
      .getPackmindGateway()
      .deployment.getContentByVersions({
        artifacts,
        agents: lockFile.agents,
      });
    return response.fileUpdates.createOrUpdate;
  } catch {
    return [];
  }
}

export async function playbookAddHandler(
  deps: PlaybookAddHandlerDependencies,
): Promise<void> {
  const {
    packmindCliHexa,
    filePath,
    spaceSlug,
    exit,
    getCwd,
    readFile,
    readSkillDirectory,
    playbookLocalRepository,
    lockFileRepository,
  } = deps;

  if (!filePath) {
    logErrorConsole(
      'Missing file path. Usage: packmind-cli playbook add <path>',
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

  // Read local content
  let localContent: string;
  let artifactName: string;
  let serializedContent: string;

  if (artifactType === 'skill') {
    const dirPath = absolutePath.endsWith('SKILL.md')
      ? path.dirname(absolutePath)
      : absolutePath;

    let files: SkillFile[];
    try {
      files = await readSkillDirectory(dirPath);
    } catch (err) {
      const staged = await tryStageRemovedFromLockFile(dirPath, {
        packmindCliHexa,
        lockFileRepository,
        playbookLocalRepository,
        codingAgent,
        exit,
      });
      if (staged) return;
      const errorMessage = err instanceof Error ? err.message : String(err);
      logErrorConsole(`Failed to read skill directory: ${errorMessage}`);
      exit(1);
      return;
    }

    const parseResult = parseSkillDirectory(files);
    if (!parseResult.success) {
      logErrorConsole(parseResult.error);
      exit(1);
      return;
    }

    artifactName = parseResult.payload.name;
    serializedContent = yaml.stringify(parseResult.payload);
    localContent = serializedContent;
  } else {
    try {
      localContent = readFile(absolutePath);
    } catch (err) {
      const staged = await tryStageRemovedFromLockFile(absolutePath, {
        packmindCliHexa,
        lockFileRepository,
        playbookLocalRepository,
        codingAgent,
        exit,
      });
      if (staged) return;
      const errorMessage = err instanceof Error ? err.message : String(err);
      logErrorConsole(`Failed to read file: ${errorMessage}`);
      exit(1);
      return;
    }

    if (artifactType === 'command') {
      const parseResult = parseCommandFile(localContent, absolutePath);
      if (!parseResult.success) {
        logErrorConsole(`Failed to parse command file: ${parseResult.error}`);
        exit(1);
        return;
      }
      artifactName = parseResult.parsed.name;
    } else {
      const parsed = parseStandardMdForAgent(localContent, codingAgent);
      if (parsed) {
        artifactName = parsed.name;
      } else {
        const lenient = parseLenientStandard(localContent, absolutePath);
        if (!lenient) {
          logErrorConsole('File is empty.');
          exit(1);
          return;
        }
        artifactName = lenient.name;
      }
    }

    serializedContent = localContent;
  }

  // Find target directory
  const fileDir =
    artifactType === 'skill'
      ? absolutePath.endsWith('SKILL.md')
        ? path.dirname(path.dirname(absolutePath))
        : path.dirname(absolutePath)
      : path.dirname(absolutePath);

  const targetDir = await findNearestConfigDir(fileDir, packmindCliHexa);
  if (!targetDir) {
    logErrorConsole(
      'Not inside a Packmind project. No packmind.json found in any parent directory.',
    );
    exit(1);
    return;
  }

  // Resolve deployed context
  const deployedContext = await resolveDeployedContext(
    packmindCliHexa,
    targetDir,
  );

  const targetId = deployedContext?.targetId;

  // Deployed content and lock file paths are relative to the project directory
  // (targetDir), not the git root. Use targetDir-relative paths for all comparisons.
  const normalizedFilePath = normalizePath(
    path.relative(targetDir, absolutePath),
  );

  // Determine changeType using lock file
  let changeType: 'created' | 'updated' = 'created';
  const lockFile = await lockFileRepository.read(targetDir);
  if (lockFile) {
    const existsInLockFile = Object.values(lockFile.artifacts).some((entry) =>
      entry.files.some((f) => normalizePath(f.path) === normalizedFilePath),
    );
    if (existsInLockFile) {
      changeType = 'updated';
    }
  }

  // Check if content matches deployed (via lock file artifact versions)
  if (changeType === 'updated' && lockFile) {
    const deployedFiles = await fetchDeployedArtifactFiles(
      packmindCliHexa,
      lockFile,
    );
    const deployedFile = deployedFiles.find(
      (f) => normalizePath(f.path) === normalizedFilePath,
    );
    if (deployedFile && deployedFile.content?.trim() === localContent.trim()) {
      logInfoConsole('Already up to date — local content matches deployed.');
      exit(0);
      return;
    }
  }

  // Resolve space ID
  let spaceId: string;
  let spaceName: string | undefined;
  if (changeType === 'updated') {
    spaceId =
      deployedContext?.spaceId ?? (await packmindCliHexa.getDefaultSpace()).id;
  } else {
    const allSpaces = await packmindCliHexa.getSpaces();

    if (spaceSlug) {
      const matchedSpace = allSpaces.find((s) => s.slug === spaceSlug);
      if (!matchedSpace) {
        logErrorConsole(
          `Space "${spaceSlug}" not found. Available spaces:\n${formatSpaceList(allSpaces)}`,
        );
        exit(1);
        return;
      }
      spaceId = matchedSpace.id;
      spaceName = matchedSpace.name;
    } else if (allSpaces.length === 1) {
      spaceId = allSpaces[0].id;
      spaceName = allSpaces[0].name;
    } else {
      logErrorConsole(
        `Multiple spaces found. Use --space to specify the target space:\n${formatSpaceList(allSpaces)}\n\nExample: packmind-cli playbook add --space ${allSpaces[0].slug} <path>`,
      );
      exit(1);
      return;
    }
  }

  playbookLocalRepository.addChange({
    filePath: normalizedFilePath,
    artifactType,
    artifactName,
    codingAgent,
    changeType,
    content: serializedContent,
    spaceId,
    spaceName,
    targetId,
    addedAt: new Date().toISOString(),
  });

  logSuccessConsole(
    `Staged "${artifactName}" (${artifactType}, ${changeType}) to playbook. ${formatLabel(codingAgent)}`,
  );
  exit(0);
}

export function formatSpaceList(spaces: Space[]): string {
  const maxSlugLength = Math.max(...spaces.map((s) => s.slug.length));
  return spaces
    .map((s) => `  ${s.slug.padEnd(maxSlugLength)}  (${s.name})`)
    .join('\n');
}
