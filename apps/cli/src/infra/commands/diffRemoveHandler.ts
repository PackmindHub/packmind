import * as path from 'path';
import * as fs from 'fs';

import { resolveArtefactFromPath } from '../../application/utils/resolveArtefactFromPath';
import { logErrorConsole, logSuccessConsole } from '../utils/consoleLogger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { ArtifactType } from '@packmind/types';
import { normalizePath } from '../../application/utils/pathUtils';

export type DiffRemoveHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  filePath: string | undefined;
  exit: (code: number) => void;
  getCwd: () => string;
};

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  command: 'command',
  standard: 'standard',
  skill: 'skill',
};

export async function diffRemoveHandler(
  deps: DiffRemoveHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, filePath, exit, getCwd } = deps;

  if (!filePath) {
    logErrorConsole(
      'Missing file path. Usage: packmind-cli diff remove <path>',
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
  if (!fs.existsSync(absolutePath)) {
    logErrorConsole(`File or directory does not exist: ${filePath}`);
    exit(1);
    return;
  }

  // Read config to get packages
  let configPackages: string[];
  let configAgents;
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

  // Get the file path relative to git root for comparison
  // At this point gitRoot is guaranteed to be non-null because we checked above
  if (!gitRoot) {
    logErrorConsole('Git root is required but not available');
    exit(1);
    return;
  }

  const relativeToGitRoot = absolutePath.startsWith(gitRoot)
    ? absolutePath.slice(gitRoot.length)
    : absolutePath;

  // Normalize by removing leading slash and converting backslashes
  let normalizedFilePath = normalizePath(relativeToGitRoot);
  if (normalizedFilePath.startsWith('/')) {
    normalizedFilePath = normalizedFilePath.slice(1);
  }

  // Check if the file exists in deployed content
  const isDeployed = deployedContent.fileUpdates.createOrUpdate.some(
    (file) => normalizePath(file.path) === normalizedFilePath,
  );

  if (!isDeployed) {
    const artifactTypeLabel = ARTIFACT_TYPE_LABELS[artefactResult.artifactType];
    logErrorConsole(`This ${artifactTypeLabel} does not come from Packmind`);
    exit(1);
    return;
  }

  logSuccessConsole('This artefact can be removed');
  exit(0);
}
