import { ArtifactType, CODING_AGENT_ARTEFACT_PATHS } from '@packmind/types';

import { normalizePath } from './pathUtils';

/**
 * Command path patterns derived from the centralized coding agent artefact paths.
 */
const COMMAND_PATH_PATTERNS: string[] = Object.values(
  CODING_AGENT_ARTEFACT_PATHS,
)
  .map((paths) => paths.command)
  .filter((p): p is string => p !== undefined);

/**
 * Resolves the artefact type from a file path by matching against known
 * agent command path patterns.
 *
 * Normalizes backslashes to forward slashes for cross-platform support,
 * then checks if the path contains any known command directory pattern.
 *
 * @returns `{ artifactType: 'command' }` if the path matches a known pattern, `null` otherwise.
 */
export function resolveArtefactFromPath(
  filePath: string,
): { artifactType: ArtifactType } | null {
  const normalized = normalizePath(filePath);

  for (const pattern of COMMAND_PATH_PATTERNS) {
    if (normalized.includes(pattern)) {
      return { artifactType: 'command' };
    }
  }

  return null;
}
