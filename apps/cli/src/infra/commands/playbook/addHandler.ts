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
import {
  ArtifactType,
  MultiFileCodingAgent,
  Space,
  validateArtifactFileFormat,
} from '@packmind/types';
import {
  findLockFileEntryForPath,
  findLockFileEntryAndFileForPath,
} from '../../../application/utils/lockFileUtils';
import { fetchDeployedFiles } from '../../utils/deployedFilesUtils';
import {
  resolveExistingArtifact,
  adoptArtifactIntoLockFile,
  ExistingArtifact,
} from './add/linkExistingArtifact';

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
  // When there is no git repo (e.g. running inside `~/.claude` for a
  // home-install), leave `configDir` undefined so the `?? '__cwd__'` fallbacks
  // in statusHandler/targetContextResolver trigger consistently. Empty string
  // is not nullish and would slip past those fallbacks.
  const configDir = gitRoot
    ? normalizePath(path.relative(gitRoot, targetDir))
    : undefined;

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
  logInfoConsole(
    `Run ${formatLabel('packmind playbook submit')} when you're ready to publish your changes.`,
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

  // Tracks the lockfile as the handler sees it, including an entry adopted by
  // linking below. The already-up-to-date check must read the adopted state.
  let activeLockFile = earlyLockFile;

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

  const formatValidation = validateArtifactFileFormat(
    absolutePath,
    artifactType,
  );
  if (!formatValidation.valid) {
    logErrorConsole(formatValidation.reason);
    exit(1);
    return;
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
        const lenient = parseLenientStandard(localContent);
        if (!lenient) {
          logErrorConsole(
            `${filePath} is not a valid artifact. Expected format:\n\n# My standard name\n\nContent goes here...`,
          );
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

  const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(targetDir);
  // When there is no git repo (e.g. running inside `~/.claude` for a
  // home-install), leave `configDir` undefined so the `?? '__cwd__'` fallbacks
  // in statusHandler/targetContextResolver trigger consistently. Empty string
  // is not nullish and would slip past those fallbacks.
  const configDir = gitRoot
    ? normalizePath(path.relative(gitRoot, targetDir))
    : undefined;

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

  // If the artifact exists in the lock file, validate its space is still accessible
  const existingLockEntry =
    earlyLockFile &&
    findLockFileEntryForPath(normalizedFilePath, earlyLockFile.artifacts);
  if (
    existingLockEntry &&
    !spaceSlug &&
    !allSpaces.some((s) => s.id === existingLockEntry.spaceId)
  ) {
    logErrorConsole(
      `Cannot add changes to this ${artifactType}: the space it belongs to is not available to you.\nUse --space to stage it as a new artifact in an accessible space:\n${formatSpaceList(allSpaces)}`,
    );
    exit(1);
    return;
  }

  if (spaceSlug) {
    const matchedSpace = allSpaces.find((s) => s.slug === spaceSlug);
    if (!matchedSpace) {
      logErrorConsole(
        `Space "@${spaceSlug}" not found. Available spaces:\n${formatSpaceList(allSpaces)}`,
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
    // For updates, use the lock file entry's space (authoritative source).
    // For new artifacts, always require --space when multiple spaces exist.
    if (existingLockEntry) {
      spaceId = existingLockEntry.spaceId;
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

  // Guard against re-adding an orphaned rendering for a deconfigured agent.
  // When an agent is dropped from packmind.json and the project is re-installed,
  // the lock file's `agents` no longer lists it. A leftover file on disk
  // (e.g. `.github/skills/X` after removing copilot) is no longer tracked, so it
  // resolves as `created` and would otherwise surface a confusing "already
  // exists" collision against the still-existing artifact. Reject it clearly.
  if (
    changeType === 'created' &&
    earlyLockFile &&
    earlyLockFile.agents.length > 0 &&
    !earlyLockFile.agents.includes(codingAgent)
  ) {
    logErrorConsole(
      `Cannot add this ${artifactType}: it is rendered for the "${codingAgent}" agent, which is not in your configured agents (${earlyLockFile.agents.join(', ')}).\n` +
        `This file is no longer managed by Packmind. Re-add "${codingAgent}" to your agents and run ${formatLabel('packmind-cli install')} to manage it again, or delete the file if it is no longer needed.`,
    );
    exit(1);
    return;
  }

  // Check if artifact is outdated before staging updates
  if (changeType === 'updated' && existingLockEntry) {
    try {
      const packmindGateway = packmindCliHexa.getPackmindGateway();
      const { version: remoteVersion } =
        await packmindGateway.deployment.getLatestVersion(
          existingLockEntry.type,
          existingLockEntry.id,
          existingLockEntry.spaceId,
        );

      if (existingLockEntry.version < remoteVersion) {
        logErrorConsole(
          `"${artifactName}" is outdated (local: v${existingLockEntry.version}, remote: v${remoteVersion}).\nRun ${formatLabel('packmind-cli install')} to update before making changes.`,
        );
        exit(1);
        return;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logErrorConsole(`Failed to check artifact version: ${errorMessage}`);
      exit(1);
      return;
    }
  }

  // Name collision check for new artifacts. A match means the local file is a
  // materialization of an artifact the lockfile never tracked (typically
  // created via `playbook submit`, which does not write the lockfile): link it
  // and stage an update instead of failing or creating a duplicate.
  if (changeType === 'created') {
    let existingArtifact: ExistingArtifact | null;
    try {
      existingArtifact = await resolveExistingArtifact(
        packmindCliHexa,
        artifactType,
        spaceId,
        artifactName,
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logErrorConsole(
        `Failed to check for existing ${artifactType}s: ${errorMessage}`,
      );
      exit(1);
      return;
    }

    if (existingArtifact) {
      let remoteVersion: number;
      try {
        const packmindGateway = packmindCliHexa.getPackmindGateway();
        ({ version: remoteVersion } =
          await packmindGateway.deployment.getLatestVersion(
            artifactType,
            existingArtifact.id,
            spaceId,
          ));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logErrorConsole(
          `Failed to link "${existingArtifact.name}" to the existing ${artifactType}: ${errorMessage}`,
        );
        exit(1);
        return;
      }

      const adoptedFilePath =
        artifactType === 'skill'
          ? `${normalizedFilePath}/SKILL.md`
          : normalizedFilePath;

      activeLockFile = adoptArtifactIntoLockFile({
        lockFile: activeLockFile,
        artifact: {
          id: existingArtifact.id,
          name: existingArtifact.name,
          type: artifactType,
          version: remoteVersion,
          spaceId,
        },
        relativeFilePath: adoptedFilePath,
        agent: codingAgent,
      });
      await lockFileRepository.write(targetDir, activeLockFile);

      changeType = 'updated';
      logInfoConsole(
        `Linked "${existingArtifact.name}" to existing ${artifactType} (v${remoteVersion})${spaceName ? ` in space "${spaceName}"` : ''} — staged as update.`,
      );
    }
  }

  // Check if content matches deployed (via lock file artifact versions)
  if (changeType === 'updated' && activeLockFile) {
    const deployedFiles = await fetchDeployedFiles(
      packmindCliHexa.getPackmindGateway(),
      activeLockFile,
      { projectDir: targetDir },
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
  logInfoConsole(
    `Run ${formatLabel('packmind playbook submit')} when you're ready to publish your changes.`,
  );
  exit(0);
}

export function formatSpaceList(spaces: Space[]): string {
  const maxSlugLength = Math.max(...spaces.map((s) => s.slug.length));
  return spaces
    .map((s) => `  ${s.slug.padEnd(maxSlugLength)}  (${s.name})`)
    .join('\n');
}
