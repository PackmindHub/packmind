import * as path from 'path';

import { resolveArtefactFromPath } from '../../application/utils/resolveArtefactFromPath';
import { logErrorConsole, logSuccessConsole } from '../utils/consoleLogger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { ArtifactType, ChangeProposalType, CodingAgent } from '@packmind/types';
import { normalizePath } from '../../application/utils/pathUtils';
import { openEditorForMessage, validateMessage } from '../utils/editorMessage';

export type DiffRemoveHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  filePath: string | undefined;
  message: string | undefined;
  exit: (code: number) => void;
  getCwd: () => string;
  existsSync: (path: string) => boolean;
  unlinkSync: (path: string) => void;
};

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  command: 'command',
  standard: 'standard',
  skill: 'skill',
};

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
  } = deps;

  if (!filePath) {
    logErrorConsole(
      'Missing file path. Usage: packmind-cli diff remove <path> -m "message"',
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

  // Check if the file or directory exists
  if (!existsSync(absolutePath)) {
    logErrorConsole(`File or directory does not exist: ${filePath}`);
    exit(1);
    return;
  }

  // Read config to get packages
  let configPackages: string[];
  let configAgents: CodingAgent[] | undefined;
  try {
    const fullConfig = await packmindCliHexa.readFullConfig(cwd);
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

  // Collect git info
  let gitRemoteUrl: string | undefined;
  let gitBranch: string | undefined;
  let relativePath: string | undefined;

  const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(cwd);
  if (gitRoot) {
    try {
      gitRemoteUrl = packmindCliHexa.getGitRemoteUrlFromPath(gitRoot);
      gitBranch = packmindCliHexa.getCurrentBranch(gitRoot);

      relativePath = cwd.startsWith(gitRoot) ? cwd.slice(gitRoot.length) : '/';
      if (!relativePath.startsWith('/')) {
        relativePath = '/' + relativePath;
      }
      if (!relativePath.endsWith('/')) {
        relativePath = relativePath + '/';
      }
    } catch (err) {
      logErrorConsole(
        `Failed to collect git info: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
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

  // gitRoot is guaranteed non-null: the early exit above checks gitRemoteUrl,
  // which is only set inside the `if (gitRoot)` block.
  const relativeToGitRoot = absolutePath.startsWith(gitRoot!)
    ? absolutePath.slice(gitRoot!.length)
    : absolutePath;

  // Normalize by removing leading slash and converting backslashes
  let normalizedFilePath = normalizePath(relativeToGitRoot);
  if (normalizedFilePath.startsWith('/')) {
    normalizedFilePath = normalizedFilePath.slice(1);
  }

  // Check if the file exists in deployed content and extract metadata
  const deployedFile = deployedContent.fileUpdates.createOrUpdate.find(
    (file) => normalizePath(file.path) === normalizedFilePath,
  );

  if (!deployedFile) {
    const artifactTypeLabel = ARTIFACT_TYPE_LABELS[artefactResult.artifactType];
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

  if (!deployedContent.targetId || !deployedContent.packageIds) {
    logErrorConsole(
      'Missing target or package information. Cannot create change proposal for removal.',
    );
    exit(1);
    return;
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
      'Non-interactive mode requires -m flag. Usage: packmind-cli diff remove <path> -m "your message"',
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
      targetId: deployedContent.targetId,
      packageIds: deployedContent.packageIds,
    },
    artifactName: deployedFile.artifactName || artefactResult.artifactType,
    artifactType: artefactResult.artifactType,
    artifactId: deployedFile.artifactId,
    spaceId: deployedFile.spaceId,
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
    logSuccessConsole('Change proposal for removal already submitted');
  }

  // Delete the file after successful submission
  try {
    unlinkSync(absolutePath);
    logSuccessConsole(`File deleted: ${filePath}`);
  } catch (err) {
    logErrorConsole(
      `Failed to delete file: ${err instanceof Error ? err.message : String(err)}`,
    );
    exit(1);
    return;
  }

  exit(0);
}
