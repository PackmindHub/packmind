import { ArtifactType } from '../deployments';

import {
  CODING_AGENT_ARTEFACT_PATHS,
  MultiFileCodingAgent,
} from './CodingAgentArtefactPaths';

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

/**
 * Backslashes are normalized to forward slashes so Windows paths match too.
 * Matching runs in three passes — command, then standard, then skill — so an
 * agent is only reported for the earlier type when its directories overlap.
 *
 * The truthiness guard on each pattern is load-bearing, not defensive: an agent
 * that does not support a type carries `''` for it, and `includes('')` is true
 * of every path.
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
