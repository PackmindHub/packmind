import {
  ArtifactType,
  CODING_AGENT_ARTEFACT_PATHS,
  MultiFileCodingAgent,
} from '@packmind/types';

import { normalizePath } from './pathUtils';

/**
 * Resolves the artefact type and coding agent from a file path by matching
 * against known agent command and standard path patterns.
 *
 * Normalizes backslashes to forward slashes for cross-platform support,
 * then checks if the path contains any known artefact directory pattern.
 * Command patterns are checked first, then standard patterns.
 *
 * @returns `{ artifactType, codingAgent }` if the path matches a known pattern, `null` otherwise.
 */
export function resolveArtefactFromPath(
  filePath: string,
): { artifactType: ArtifactType; codingAgent: MultiFileCodingAgent } | null {
  const normalized = normalizePath(filePath);

  for (const [agent, paths] of Object.entries(CODING_AGENT_ARTEFACT_PATHS)) {
    if (paths.command && normalized.includes(paths.command)) {
      return {
        artifactType: 'command',
        codingAgent: agent as MultiFileCodingAgent,
      };
    }
  }

  for (const [agent, paths] of Object.entries(CODING_AGENT_ARTEFACT_PATHS)) {
    if (paths.standard && normalized.includes(paths.standard)) {
      return {
        artifactType: 'standard',
        codingAgent: agent as MultiFileCodingAgent,
      };
    }
  }

  for (const [agent, paths] of Object.entries(CODING_AGENT_ARTEFACT_PATHS)) {
    if (paths.skill && normalized.includes(paths.skill)) {
      return {
        artifactType: 'skill',
        codingAgent: agent as MultiFileCodingAgent,
      };
    }
  }

  return null;
}
