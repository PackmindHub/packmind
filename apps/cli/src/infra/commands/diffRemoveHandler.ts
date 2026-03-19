import * as path from 'path';

import { resolveArtefactFromPath } from '../../application/utils/resolveArtefactFromPath';
import {
  logErrorConsole,
  logSuccessConsole,
  logWarningConsole,
} from '../utils/consoleLogger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { findNearestConfigDir } from '../../application/utils/findNearestConfigDir';
import {
  ArtifactType,
  ChangeProposalType,
  CodingAgent,
  createPackageId,
  createTargetId,
} from '@packmind/types';
import { normalizePath } from '../../application/utils/pathUtils';
import { openEditorForMessage, validateMessage } from '../utils/editorMessage';
import { PackmindLockFile } from '../../domain/repositories/PackmindLockFile';

export type DiffRemoveHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  filePath: string | undefined;
  message: string | undefined;
  exit: (code: number) => void;
  getCwd: () => string;
  existsSync: (path: string) => boolean;
  unlinkSync: (path: string) => void;
  rmSync: (path: string, options?: { recursive?: boolean }) => void;
};

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  command: 'command',
  standard: 'standard',
  skill: 'skill',
};

type ArtifactMetadataResult = {
  artifactId: string;
  spaceId: string;
  packageIds: string[];
  artifactName: string;
  targetId: string;
};

function findArtifactInLockFile(
  lockFile: PackmindLockFile,
  filePathForComparison: string,
  expectedArtifactType: ArtifactType,
): ArtifactMetadataResult | null {
  if (!lockFile.targetId) {
    return null;
  }

  for (const entry of Object.values(lockFile.artifacts)) {
    if (entry.type !== expectedArtifactType) {
      continue;
    }

    const matchingFile = entry.files.find(
      (f) => normalizePath(f.path) === filePathForComparison,
    );

    if (matchingFile && entry.packageIds.length > 0) {
      return {
        artifactId: entry.id,
        spaceId: entry.spaceId,
        packageIds: entry.packageIds,
        artifactName: entry.name,
        targetId: lockFile.targetId,
      };
    }
  }

  return null;
}

function computeFilePathRelativeToTarget(
  absoluteFilePath: string,
  cwd: string,
  gitRoot: string,
): string {
  const relGitRoot = path.relative(gitRoot, absoluteFilePath);
  const relativeToGitRoot = relGitRoot.startsWith('..')
    ? absoluteFilePath
    : relGitRoot;

  let normalizedFilePath = normalizePath(relativeToGitRoot);
  if (normalizedFilePath.startsWith('/')) {
    normalizedFilePath = normalizedFilePath.slice(1);
  }

  // Paths are relative to the target (cwd relative to git root)
  const relCwd = path.relative(gitRoot, cwd);
  const relativePathPrefix = relCwd.startsWith('..')
    ? ''
    : relCwd
      ? relCwd + '/'
      : '';
  return relativePathPrefix.length > 0 &&
    normalizedFilePath.startsWith(relativePathPrefix)
    ? normalizedFilePath.slice(relativePathPrefix.length)
    : normalizedFilePath;
}

export async function diffRemoveHandler(
  deps: DiffRemoveHandlerDependencies,
): Promise<void> {
  const {
    packmindCliHexa,
    filePath,
    message: messageFlag,
    exit,
    getCwd,
    existsSync,
    unlinkSync,
    rmSync,
  } = deps;

  if (!filePath) {
    logErrorConsole(
      'Missing file path. Usage: packmind diff remove <path> -m "message"',
    );
    exit(1);
    return;
  }

  const cwd = getCwd();
  const absolutePath = path.resolve(cwd, filePath);

  const artefactResult = resolveArtefactFromPath(absolutePath);
  if (!artefactResult) {
    logErrorConsole(
      `Unsupported file path: ${absolutePath}. File must be in a recognized artefact directory (command, standard, or skill).`,
    );
    exit(1);
    return;
  }

  // Same detection as diffAddHandler (line 75), inverse normalization
  const matchPath =
    artefactResult.artifactType === 'skill'
      ? absolutePath.endsWith('SKILL.md')
        ? absolutePath
        : path.join(absolutePath, 'SKILL.md')
      : absolutePath;
  const skillDirPath =
    artefactResult.artifactType === 'skill'
      ? absolutePath.endsWith('SKILL.md')
        ? path.dirname(absolutePath)
        : absolutePath
      : undefined;

  // Check if the file or directory exists
  const existsCheckPath = skillDirPath ?? absolutePath;
  if (!existsSync(existsCheckPath)) {
    logErrorConsole(`File or directory does not exist: ${filePath}`);
    exit(1);
    return;
  }

  // Infer target directory from the file path (walk up to nearest packmind.json)
  const fileDir = skillDirPath
    ? path.dirname(skillDirPath)
    : path.dirname(absolutePath);

  const targetDir = await findNearestConfigDir(fileDir, packmindCliHexa);
  if (!targetDir) {
    logErrorConsole(
      'Not inside a Packmind project. No packmind.json found in any parent directory.',
    );
    exit(1);
    return;
  }

  // Read config to get packages
  let configPackages: string[];
  let configAgents: CodingAgent[] | undefined;
  try {
    const fullConfig = await packmindCliHexa.readFullConfig(targetDir);
    if (fullConfig) {
      configPackages = Object.keys(fullConfig.packages);
      configAgents = fullConfig.agents;
    } else {
      configPackages = [];
    }
  } catch (err) {
    logErrorConsole('Failed to parse packmind.json');
    if (err instanceof Error) {
      logErrorConsole(err.message);
    } else {
      logErrorConsole(String(err));
    }
    logErrorConsole(
      '\n💡 Please fix the packmind.json file or delete it to continue.',
    );
    exit(1);
    return;
  }

  if (configPackages.length === 0) {
    logErrorConsole(
      'No packages configured. Configure packages in packmind.json first.',
    );
    exit(1);
    return;
  }

  // Resolve git root once, shared by both lock file and API fallback paths
  const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(targetDir);

  // Try to resolve artifact metadata from lock file first
  let metadata: ArtifactMetadataResult | null = null;

  const lockFile = await packmindCliHexa.readLockFile(targetDir);
  if (lockFile) {
    const lockFilePathForComparison = gitRoot
      ? computeFilePathRelativeToTarget(matchPath, targetDir, gitRoot)
      : normalizePath(path.relative(targetDir, matchPath));

    metadata = findArtifactInLockFile(
      lockFile,
      lockFilePathForComparison,
      artefactResult.artifactType,
    );
  }

  // Fall back to getDeployed() API if lock file didn't provide the metadata
  if (!metadata) {
    if (!gitRoot) {
      logErrorConsole(
        '\n❌ Could not determine git repository info. The diff command requires a git repository with a remote configured.',
      );
      exit(1);
      return;
    }

    // Collect git info
    let gitRemoteUrl: string | undefined;
    let gitBranch: string | undefined;
    let relativePath: string | undefined;

    try {
      gitRemoteUrl = packmindCliHexa.getGitRemoteUrlFromPath(gitRoot);
      gitBranch = packmindCliHexa.getCurrentBranch(gitRoot);

      const rel = path.relative(gitRoot, targetDir);
      relativePath = rel.startsWith('..') ? '/' : rel ? `/${rel}/` : '/';
    } catch (err) {
      logErrorConsole(
        `Failed to collect git info: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (!gitRemoteUrl || !gitBranch || !relativePath) {
      logErrorConsole(
        '\n❌ Could not determine git repository info. The diff command requires a git repository with a remote configured.',
      );
      exit(1);
      return;
    }

    // Query what's deployed
    const deployedContent = await packmindCliHexa
      .getPackmindGateway()
      .deployment.getDeployed({
        packagesSlugs: configPackages,
        gitRemoteUrl,
        gitBranch,
        relativePath,
        agents: configAgents,
      });

    const filePathForComparison = computeFilePathRelativeToTarget(
      matchPath,
      targetDir,
      gitRoot,
    );

    // Check if the file exists in deployed content and extract metadata
    const deployedFile = deployedContent.fileUpdates.createOrUpdate.find(
      (file) => normalizePath(file.path) === filePathForComparison,
    );

    if (!deployedFile) {
      const artifactTypeLabel =
        ARTIFACT_TYPE_LABELS[artefactResult.artifactType];
      logErrorConsole(`This ${artifactTypeLabel} does not come from Packmind`);
      exit(1);
      return;
    }

    // Validate we have the necessary metadata for creating a change proposal
    if (!deployedFile.artifactId || !deployedFile.spaceId) {
      logErrorConsole(
        'Missing artifact metadata. Cannot create change proposal for removal.',
      );
      exit(1);
      return;
    }

    if (!deployedContent.targetId || !deployedFile.packageIds) {
      logErrorConsole(
        'Missing target or package information. Cannot create change proposal for removal.',
      );
      exit(1);
      return;
    }

    metadata = {
      artifactId: deployedFile.artifactId,
      spaceId: deployedFile.spaceId,
      packageIds: deployedFile.packageIds,
      artifactName: deployedFile.artifactName || artefactResult.artifactType,
      targetId: deployedContent.targetId,
    };
  }

  // Validate and get message
  let message: string;
  if (messageFlag !== undefined) {
    const validation = validateMessage(messageFlag);
    if (!validation.valid) {
      logErrorConsole(validation.error);
      exit(1);
      return;
    }
    message = validation.message;
  } else if (process.stdin.isTTY) {
    const editorMessage = openEditorForMessage();
    const validation = validateMessage(editorMessage);
    if (!validation.valid) {
      logErrorConsole(
        'Aborting submission: empty message. Use -m to provide a message.',
      );
      exit(1);
      return;
    }
    message = validation.message;
  } else {
    logErrorConsole(
      'Non-interactive mode requires -m flag. Usage: packmind diff remove <path> -m "your message"',
    );
    exit(1);
    return;
  }

  // Submit change proposal for removal
  const changeProposalType =
    artefactResult.artifactType === 'standard'
      ? ChangeProposalType.removeStandard
      : artefactResult.artifactType === 'command'
        ? ChangeProposalType.removeCommand
        : ChangeProposalType.removeSkill;

  const diff = {
    filePath: absolutePath,
    type: changeProposalType,
    payload: {
      packageIds: metadata.packageIds.map(createPackageId),
    },
    artifactName: metadata.artifactName,
    artifactType: artefactResult.artifactType,
    artifactId: metadata.artifactId,
    spaceId: metadata.spaceId,
    targetId: createTargetId(metadata.targetId),
  };

  const result = await packmindCliHexa.submitDiffs([[diff]], message);

  for (const err of result.errors) {
    logErrorConsole(`Failed to submit removal "${err.name}": ${err.message}`);
  }

  if (result.errors.length > 0) {
    exit(1);
    return;
  }

  if (result.submitted > 0) {
    logSuccessConsole('Change proposal for removal submitted successfully');
  } else if (result.alreadySubmitted > 0) {
    logWarningConsole('Change proposal for removal already submitted');
  }

  // Delete the file/directory after successful submission
  try {
    if (skillDirPath) {
      rmSync(skillDirPath, { recursive: true });
      logSuccessConsole(`Directory deleted: ${skillDirPath}`);
    } else {
      unlinkSync(absolutePath);
      logSuccessConsole(`File deleted: ${filePath}`);
    }
  } catch (err) {
    logErrorConsole(
      `Failed to delete file: ${err instanceof Error ? err.message : String(err)}`,
    );
    exit(1);
    return;
  }

  exit(0);
}
