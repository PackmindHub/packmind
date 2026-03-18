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
  exit: (code: number) => void;
  getCwd: () => string;
  readFile: (path: string) => string;
  readSkillDirectory: (dirPath: string) => Promise<SkillFile[]>;
  playbookLocalRepository: IPlaybookLocalRepository;
  lockFileRepository: ILockFileRepository;
};

export async function playbookAddHandler(
  deps: PlaybookAddHandlerDependencies,
): Promise<void> {
  const {
    packmindCliHexa,
    filePath,
    exit,
    getCwd,
    readFile,
    readSkillDirectory,
    playbookLocalRepository,
    lockFileRepository,
  } = deps;

  if (!filePath) {
    logErrorConsole('Missing file path. Usage: packmind playbook add <path>');
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

  const spaceId =
    deployedContext?.spaceId ?? (await packmindCliHexa.getDefaultSpace()).id;
  const targetId = deployedContext?.targetId;

  // Deployed content and lock file paths are relative to the project directory
  // (targetDir), not the git root. Use targetDir-relative paths for all comparisons.
  const normalizedFilePath = normalizePath(
    path.relative(targetDir, absolutePath),
  );

  // Check if content matches deployed
  if (deployedContext?.deployedContent) {
    const deployedFile =
      deployedContext.deployedContent.fileUpdates.createOrUpdate.find(
        (f) => normalizePath(f.path) === normalizedFilePath,
      );

    if (deployedFile && deployedFile.content === localContent) {
      logInfoConsole('Already up to date — local content matches deployed.');
      exit(0);
      return;
    }
  }

  // Determine changeType: check deployed content first, then fall back to lock file
  let changeType: 'created' | 'updated' = 'created';
  if (deployedContext?.deployedContent) {
    const existsInDeployed =
      deployedContext.deployedContent.fileUpdates.createOrUpdate.some(
        (f) => normalizePath(f.path) === normalizedFilePath,
      );
    if (existsInDeployed) {
      changeType = 'updated';
    }
  }
  if (changeType === 'created') {
    const lockFile = await lockFileRepository.read(targetDir);
    if (lockFile) {
      const existsInLockFile = Object.values(lockFile.artifacts).some((entry) =>
        entry.files.some((f) => normalizePath(f.path) === normalizedFilePath),
      );
      if (existsInLockFile) {
        changeType = 'updated';
      }
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
    targetId,
    addedAt: new Date().toISOString(),
  });

  logSuccessConsole(
    `Staged "${artifactName}" (${artifactType}, ${changeType}) to playbook. ${formatLabel(codingAgent)}`,
  );
  exit(0);
}
