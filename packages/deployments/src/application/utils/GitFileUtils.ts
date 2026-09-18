import { IGitPort, GitRepo, Target, CodingAgent } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { ConflictingTargetFilePathError } from '../../domain/errors/ConflictingTargetFilePathError';

const origin = 'GitFileUtils';

/**
 * Maps a coding agent to its corresponding file path in the repository
 */
function getFilePathForAgent(agent: CodingAgent): string {
  const agentToFile: Record<CodingAgent, string> = {
    claude: 'CLAUDE.md',
    claude_plugin: '',
    agents_md: 'AGENTS.md',
    cursor: '.cursor/rules/packmind/recipes-index.mdc',
    copilot: '.github/copilot-instructions.md',
    junie: '.junie/guidelines.md',
    packmind: '.packmind.md',
    gitlab_duo: '.gitlab/duo/chat-rules.md',
    continue: '.continue/rules/packmind-recipes-index.md',
    opencode: 'AGENTS.md',
    codex: 'AGENTS.md',
    kiro: '',
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
  // Handle root targets (path is '/' or empty)
  if (!target.path || target.path === '/') {
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

  // Deduplicate agents by file path to avoid fetching the same file multiple times
  // (e.g. both 'opencode' and 'agents_md' map to 'AGENTS.md')
  const uniquePaths = new Map<string, CodingAgent>();
  for (const agent of codingAgents) {
    const basePath = getFilePathForAgent(agent);
    if (!uniquePaths.has(basePath)) {
      uniquePaths.set(basePath, agent);
    }
  }

  for (const [basePath, agent] of uniquePaths) {
    try {
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
 * Merges source file updates into target, avoiding duplicates by path.
 * The first entry claiming a path wins.
 */
export function mergeFileUpdates(
  target: import('@packmind/types').FileUpdates,
  source: import('@packmind/types').FileUpdates,
): void {
  const existingPaths = new Set(target.createOrUpdate.map((f) => f.path));
  for (const file of source.createOrUpdate) {
    if (!existingPaths.has(file.path)) {
      target.createOrUpdate.push(file);
      existingPaths.add(file.path);
    }
  }

  const existingDeletePaths = new Set(target.delete.map((f) => f.path));
  for (const file of source.delete) {
    if (!existingDeletePaths.has(file.path)) {
      target.delete.push(file);
      existingDeletePaths.add(file.path);
    }
  }
}

/**
 * What a modification actually writes to git. Comparing this is all that
 * decides whether committing one modification in place of another loses
 * anything; the metadata around it only feeds the lock file, itself a
 * modification with content.
 */
function writtenBytes(
  file: import('@packmind/types').FileModification,
): string {
  if (file.content !== undefined) {
    return `content:${file.isBase64 === true}:${file.content}`;
  }
  return `sections:${JSON.stringify(file.sections)}`;
}

type ClaimedFile<TFile> = { targetIndex: number; file: TFile };

/**
 * Merges the per-target file updates of a repository group into the single set
 * of updates that gets committed.
 *
 * Every target in the group shares one commit, so every target's files must be
 * in it - taking one target's updates would silently drop the others'. Paths
 * are target-prefixed by `applyTargetPrefixingToFileUpdates`, so two targets in
 * the same repository only claim the same path when they were configured with
 * the same path. Nothing enforces distinct paths, so that clash is possible and
 * has no correct outcome: the two targets each want their own content there,
 * and their lock files never match, since the lock file names its target. It
 * raises ConflictingTargetFilePathError rather than committing one of them and
 * reporting success to both.
 *
 * A path a single target both writes and deletes is left alone: that is what it
 * asked for on its own, and merging must not change it.
 */
export function mergeFileUpdatesAcrossTargets(
  fileUpdatesPerTarget: Iterable<import('@packmind/types').FileUpdates>,
): import('@packmind/types').FileUpdates {
  const written = new Map<
    string,
    ClaimedFile<import('@packmind/types').FileModification>
  >();
  const deleted = new Map<
    string,
    ClaimedFile<import('@packmind/types').DeleteItem>
  >();

  let targetIndex = 0;
  for (const targetFileUpdates of fileUpdatesPerTarget) {
    for (const file of targetFileUpdates.createOrUpdate) {
      const claimed = written.get(file.path);
      if (!claimed) {
        written.set(file.path, { targetIndex, file });
        continue;
      }
      if (
        claimed.targetIndex !== targetIndex &&
        writtenBytes(claimed.file) !== writtenBytes(file)
      ) {
        throw new ConflictingTargetFilePathError(file.path);
      }
    }

    for (const file of targetFileUpdates.delete) {
      // Several targets asking to delete the same path ask for the same thing.
      if (!deleted.has(file.path)) {
        deleted.set(file.path, { targetIndex, file });
      }
    }

    targetIndex += 1;
  }

  for (const [path, claimed] of deleted) {
    const writer = written.get(path);
    if (writer && writer.targetIndex !== claimed.targetIndex) {
      throw new ConflictingTargetFilePathError(path);
    }
  }

  return {
    createOrUpdate: Array.from(written.values()).map((claimed) => claimed.file),
    delete: Array.from(deleted.values()).map((claimed) => claimed.file),
  };
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
