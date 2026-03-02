import { CodingAgent } from './CodingAgent';
import { ArtifactType } from '../deployments';

/**
 * Directory paths where a coding agent stores each artefact type.
 * Undefined means the agent doesn't support that artefact type as discrete files.
 */
export type CodingAgentArtefactPaths = {
  [K in ArtifactType]: string;
};

/**
 * Coding agents that deploy artefacts as discrete files in separate directories.
 * Single-file agents (junie, agents_md, gitlab_duo) embed everything in one file
 * and are intentionally excluded.
 */
export type MultiFileCodingAgent = Extract<
  CodingAgent,
  'claude' | 'cursor' | 'copilot' | 'continue' | 'packmind'
>;

/**
 * Centralized mapping of coding agents to their artefact directory paths.
 *
 * Only multi-file agents have entries. Single-file agents embed artefacts
 * in a single file and have no discrete artefact directories — they don't
 * need entries here. The intersection type ensures:
 * - Literal key access (e.g. `.claude`) returns CodingAgentArtefactPaths (non-undefined)
 * - Dynamic CodingAgent access returns CodingAgentArtefactPaths | undefined
 */
export const CODING_AGENT_ARTEFACT_PATHS: Record<
  MultiFileCodingAgent,
  CodingAgentArtefactPaths
> &
  Partial<Record<CodingAgent, CodingAgentArtefactPaths>> = {
  claude: {
    command: '.claude/commands/',
    standard: '.claude/rules/packmind/',
    skill: '.claude/skills/',
  },
  cursor: {
    command: '.cursor/commands/',
    standard: '.cursor/rules/packmind/',
    skill: '.cursor/skills/',
  },
  copilot: {
    command: '.github/prompts/',
    standard: '.github/instructions/',
    skill: '.github/skills/',
  },
  continue: {
    command: '.continue/prompts/',
    standard: '.continue/rules/packmind/',
    skill: '',
  },
  packmind: {
    command: '.packmind/commands/',
    standard: '.packmind/standards/',
    skill: '',
  },
};
