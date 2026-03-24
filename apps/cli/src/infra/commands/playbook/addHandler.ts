import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

import { resolveArtefactFromPath } from '../../../application/utils/resolveArtefactFromPath';
import { parseCommandFile } from '../../../application/utils/parseCommandFile';
import { parseStandardMdForAgent } from '../../../application/utils/parseStandardMd';
import { parseLenientStandard } from '../../../application/utils/parseLenientStandard';
import { parseSkillDirectory } from '../../../application/utils/parseSkillDirectory';
import { findNearestConfigDir } from '../../../application/utils/findNearestConfigDir';
import { resolveDeployedContext } from '../../../application/utils/resolveDeployedContext';
import {
  formatLabel,
  logErrorConsole,
  logInfoConsole,
  logSuccessConsole,
} from '../../utils/consoleLogger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { IPlaybookLocalRepository } from '../../../domain/repositories/IPlaybookLocalRepository';
import { ILockFileRepository } from '../../../domain/repositories/ILockFileRepository';
import { normalizePath } from '../../../application/utils/pathUtils';
import { ArtifactType, MultiFileCodingAgent, Space } from '@packmind/types';
import {
  findLockFileEntryForPath,
  findLockFileEntryAndFileForPath,
} from '../../../application/utils/lockFileUtils';
import { fetchDeployedFiles } from '../../utils/deployedFilesUtils';

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
  cwd: string;
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

  const gitRoot = await deps.packmindCliHexa.tryGetGitRepositoryRoot(targetDir);
  const configDir = gitRoot
    ? normalizePath(path.relative(gitRoot, targetDir))
    : '';

  const deployedContext = await resolveDeployedContext(
    deps.packmindCliHexa,
    targetDir,
  );
  const allSpaces = await deps.packmindCliHexa.getSpaces();
  const spaceName = allSpaces.find((s) => s.id === lockEntry.spaceId)?.name;

  deps.playbookLocalRepository.addChange({
    filePath: normalizedPath,
    artifactType: lockEntry.type,
    artifactName: lockEntry.name,
    codingAgent: deps.codingAgent,
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
  deps.exit(0);
  return true;
}

function resolveSkillDirectoryRoot(absolutePath: string): string {
  if (absolutePath.endsWith('SKILL.md')) {
    return path.dirname(absolutePath);
  }

  try {
    if (fs.statSync(absolutePath).isDirectory()) {
      return absolutePath;
    }
  } catch {
    // Path doesn't exist — return as-is and let downstream handle the error
    return absolutePath;
  }

  // absolutePath is a file inside a skill directory — walk up looking for SKILL.md
  let current = path.dirname(absolutePath);
  const root = path.parse(current).root;
  while (current !== root) {
    if (fs.existsSync(path.join(current, 'SKILL.md'))) {
      return current;
    }
    current = path.dirname(current);
  }

  return absolutePath;
}

export async function playbookAddHandler(
  deps: PlaybookAddHandlerDependencies,
): Promise<void> {
  const {
    packmindCliHexa,
    filePath,
    spaceSlug,
    exit,
    cwd,
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

  const absolutePath = path.resolve(cwd, filePath);

  // Try resolving artifact type and agent from the lock file first (source of truth),
  // then fall back to path-based pattern matching for new artifacts.
  let artifactType: ArtifactType;
  let codingAgent: MultiFileCodingAgent;

  const earlyTargetDir = await findNearestConfigDir(
    path.dirname(absolutePath),
    packmindCliHexa,
  );
  const earlyLockFile = earlyTargetDir
    ? await lockFileRepository.read(earlyTargetDir)
    : null;

  if (earlyLockFile && earlyTargetDir) {
    const normalizedForLookup = normalizePath(
      path.relative(earlyTargetDir, absolutePath),
    );
    const lockResult = findLockFileEntryAndFileForPath(
      normalizedForLookup,
      earlyLockFile.artifacts,
    );
    if (lockResult) {
      artifactType = lockResult.entry.type;
      codingAgent = lockResult.file.agent;
    } else {
      const artefactResult = resolveArtefactFromPath(absolutePath);
      if (!artefactResult) {
        logErrorConsole(
          `Unsupported file path: ${absolutePath}. File must be in a recognized artefact directory (command, standard, or skill).`,
        );
        exit(1);
        return;
      }
      artifactType = artefactResult.artifactType;
      codingAgent = artefactResult.codingAgent;
    }
  } else {
    const artefactResult = resolveArtefactFromPath(absolutePath);
    if (!artefactResult) {
      logErrorConsole(
        `Unsupported file path: ${absolutePath}. File must be in a recognized artefact directory (command, standard, or skill).`,
      );
      exit(1);
      return;
    }
    artifactType = artefactResult.artifactType;
    codingAgent = artefactResult.codingAgent;
  }

  // Read local content
  let localContent: string;
  let artifactName: string;
  let serializedContent: string;
  let skillFiles: SkillFile[] = [];

  let skillDirPath: string | undefined;

  if (artifactType === 'skill') {
    const dirPath = resolveSkillDirectoryRoot(absolutePath);
    skillDirPath = dirPath;

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

    skillFiles = files;

    const parseResult = parseSkillDirectory(files);
    if (!parseResult.success) {
      logErrorConsole(parseResult.error);
      exit(1);
      return;
    }

    artifactName = parseResult.payload.name;
    serializedContent = yaml.stringify(parseResult.payload);

    const skillMdFile = files.find((f) => f.relativePath === 'SKILL.md');
    localContent = skillMdFile?.content ?? serializedContent;
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

  // Reuse the target directory resolved earlier for lock file lookup
  const targetDir = earlyTargetDir;
  if (!targetDir) {
    logErrorConsole(
      'Not inside a Packmind project. No packmind.json found in any parent directory.',
    );
    exit(1);
    return;
  }

  // Compute configDir: relative path from git root to targetDir
  const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(targetDir);
  const configDir = gitRoot
    ? normalizePath(path.relative(gitRoot, targetDir))
    : '';

  // Resolve deployed context
  const deployedContext = await resolveDeployedContext(
    packmindCliHexa,
    targetDir,
  );

  // Prefer the targetId from the deployed context, but fall back to the lock file's
  // targetId (written during install) when the git-provider lookup doesn't resolve
  // a target (e.g. no GitHub integration configured).
  const targetId = deployedContext?.targetId ?? earlyLockFile?.targetId;

  // Deployed content and lock file paths are relative to the project directory
  // (targetDir), not the git root. Use targetDir-relative paths for all comparisons.
  // For skills, normalize to the skill directory path since lock file entries
  // store individual file paths but playbook should reference the skill directory.
  const normalizedFilePath = (() => {
    const refPath =
      artifactType === 'skill' && skillDirPath ? skillDirPath : absolutePath;
    return normalizePath(path.relative(targetDir, refPath));
  })();

  // Resolve space ID
  let spaceId: string;
  let spaceName: string | undefined;
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
    // For updates, use the deployed context space as default.
    // For new artifacts, always require --space when multiple spaces exist.
    const isExistingArtifact =
      earlyLockFile &&
      findLockFileEntryForPath(normalizedFilePath, earlyLockFile.artifacts);
    const deployedSpaceId = deployedContext?.spaceId;

    if (isExistingArtifact && deployedSpaceId) {
      spaceId = deployedSpaceId;
      spaceName = allSpaces.find((s) => s.id === spaceId)?.name;
    } else {
      logErrorConsole(
        `Multiple spaces found. Use --space to specify the target space:\n${formatSpaceList(allSpaces)}\n\nExample: packmind-cli playbook add --space ${allSpaces[0].slug} <path>`,
      );
      exit(1);
      return;
    }
  }

  // Determine changeType using lock file
  let changeType: 'created' | 'updated' = 'created';
  if (earlyLockFile) {
    const matchingEntry = findLockFileEntryForPath(
      normalizedFilePath,
      earlyLockFile.artifacts,
    );
    if (matchingEntry && matchingEntry.spaceId === spaceId) {
      changeType = 'updated';
    }
  }

  // Check if content matches deployed (via lock file artifact versions)
  if (changeType === 'updated' && earlyLockFile) {
    const deployedFiles = await fetchDeployedFiles(
      packmindCliHexa.getPackmindGateway(),
      earlyLockFile,
    );

    if (artifactType === 'skill') {
      // For skills, check all files in the skill directory
      const skillDeployedFiles = deployedFiles.filter((f) =>
        normalizePath(f.path).startsWith(normalizedFilePath + '/'),
      );
      const allMatch =
        skillDeployedFiles.length > 0 &&
        skillDeployedFiles.length === skillFiles.length &&
        skillDeployedFiles.every((deployed) => {
          const localFile = skillFiles.find(
            (f) =>
              normalizePath(path.join(normalizedFilePath, f.relativePath)) ===
              normalizePath(deployed.path),
          );
          return (
            localFile &&
            deployed.content?.trim() === localFile.content.trim() &&
            (!deployed.skillFilePermissions ||
              deployed.skillFilePermissions === localFile.permissions)
          );
        });
      if (allMatch) {
        logInfoConsole('Already up to date — local content matches deployed.');
        exit(0);
        return;
      }
    } else {
      const deployedFile = deployedFiles.find(
        (f) => normalizePath(f.path) === normalizedFilePath,
      );
      if (
        deployedFile &&
        deployedFile.content?.trim() === localContent.trim()
      ) {
        logInfoConsole('Already up to date — local content matches deployed.');
        exit(0);
        return;
      }
    }
  }

  playbookLocalRepository.addChange({
    filePath: normalizedFilePath,
    artifactType,
    artifactName,
    codingAgent,
    configDir,
    changeType,
    content: serializedContent,
    spaceId,
    spaceName,
    targetId,
    addedAt: new Date().toISOString(),
  });

  const spaceInfo = spaceName ? ` in space "${spaceName}"` : '';
  logSuccessConsole(
    `Staged "${artifactName}" (${artifactType}, ${changeType}) to playbook${spaceInfo}. ${formatLabel(codingAgent)}`,
  );
  exit(0);
}

export function formatSpaceList(spaces: Space[]): string {
  const maxSlugLength = Math.max(...spaces.map((s) => s.slug.length));
  return spaces
    .map((s) => `  ${s.slug.padEnd(maxSlugLength)}  (${s.name})`)
    .join('\n');
}
