import { IGitPort, GitRepo, Target, CodingAgent } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';

const origin = 'GitFileUtils';

/**
 * Maps a coding agent to its corresponding file path in the repository
 */
export function getFilePathForAgent(agent: CodingAgent): string {
  const agentToFile: Record<CodingAgent, string> = {
    claude: 'CLAUDE.md',
    agents_md: 'AGENTS.md',
    cursor: '.cursor/rules/packmind/recipes-index.mdc',
    copilot: '.github/copilot-instructions.md',
    junie: '.junie.md',
    packmind: '.packmind.md',
    gitlab_duo: '.gitlab/duo_chat.yml',
    continue: '.continue/rules/packmind-recipes-index.md',
  };

  return agentToFile[agent];
}

/**
 * Applies target path prefix to a file path
 */
export function getTargetPrefixedPath(
  filePath: string,
  target: Target,
): string {
  if (target.path === '/') {
    return filePath;
  }

  // Remove leading "/" from target path before prefixing
  let cleanTargetPath = target.path.startsWith('/')
    ? target.path.slice(1)
    : target.path;

  // Ensure target path ends with "/" for proper concatenation
  if (!cleanTargetPath.endsWith('/')) {
    cleanTargetPath += '/';
  }

  return `${cleanTargetPath}${filePath}`;
}

/**
 * Fetches existing file content from git for each coding agent
 * Returns a map of base file path -> content
 */
export async function fetchExistingFilesFromGit(
  gitPort: IGitPort,
  gitRepo: GitRepo,
  target: Target,
  codingAgents: CodingAgent[],
  logger: PackmindLogger = new PackmindLogger(origin),
): Promise<Map<string, string>> {
  logger.info('Fetching existing files from git', {
    gitRepoId: gitRepo.id,
    targetId: target.id,
    targetPath: target.path,
    agentsCount: codingAgents.length,
  });

  const existingFiles = new Map<string, string>();

  for (const agent of codingAgents) {
    try {
      const basePath = getFilePathForAgent(agent);
      const prefixedPath = getTargetPrefixedPath(basePath, target);

      logger.debug('Fetching file for agent', {
        agent,
        basePath,
        prefixedPath,
      });

      const existingFile = await gitPort.getFileFromRepo(gitRepo, prefixedPath);

      if (existingFile?.content) {
        existingFiles.set(basePath, existingFile.content);
        logger.debug('Found existing file for agent', {
          agent,
          basePath,
          contentLength: existingFile.content.length,
        });
      } else {
        logger.debug('No existing file found for agent', {
          agent,
          basePath,
        });
      }
    } catch (error) {
      logger.debug('Failed to fetch file for agent (will use empty content)', {
        agent,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue with empty content for this agent
    }
  }

  logger.info('Fetched existing files from git', {
    filesFound: existingFiles.size,
    totalAgents: codingAgents.length,
  });

  return existingFiles;
}

/**
 * Applies target path prefixing to FileUpdates
 * Transforms base paths from coding-agent domain to target-prefixed paths
 */
export function applyTargetPrefixingToFileUpdates(
  fileUpdates: import('@packmind/types').FileUpdates,
  target: Target,
  logger: PackmindLogger = new PackmindLogger(origin),
): import('@packmind/types').FileUpdates {
  logger.debug('Applying target prefixing to file updates', {
    targetId: target.id,
    targetPath: target.path,
    createOrUpdateCount: fileUpdates.createOrUpdate.length,
    deleteCount: fileUpdates.delete.length,
  });

  const prefixed: import('@packmind/types').FileUpdates = {
    createOrUpdate: fileUpdates.createOrUpdate.map((file) => ({
      ...file,
      path: getTargetPrefixedPath(file.path, target),
    })),
    delete: fileUpdates.delete.map((file) => ({
      path: getTargetPrefixedPath(file.path, target),
      type: file.type,
    })),
  };

  logger.debug('Applied target prefixing', {
    createOrUpdateCount: prefixed.createOrUpdate.length,
    deleteCount: prefixed.delete.length,
  });

  return prefixed;
}
