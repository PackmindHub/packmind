import { CodingAgent } from './CodingAgent';
import { ArtifactType } from '../deployments';

/**
 * Directory paths where a coding agent stores each artefact type. An empty
 * string means that agent does not store the type as discrete files.
 */
export type CodingAgentArtefactPaths = {
  [K in ArtifactType]: string;
};

/**
 * Agents that deploy artefacts as discrete files in separate directories. The
 * single-file agents junie and agents_md embed everything in one file and are
 * deliberately excluded. gitlab_duo is a hybrid, included for its skills while
 * its standards and commands stay single-file.
 */
export type MultiFileCodingAgent = Extract<
  CodingAgent,
  | 'claude'
  | 'claude_plugin'
  | 'cursor'
  | 'copilot'
  | 'continue'
  | 'packmind'
  | 'gitlab_duo'
  | 'opencode'
  | 'codex'
  | 'kiro'
>;

/**
 * Only multi-file agents have entries. The intersection type is what makes both
 * access patterns behave: a literal key such as `.claude` types as
 * `CodingAgentArtefactPaths`, while indexing by an arbitrary `CodingAgent`
 * types as `CodingAgentArtefactPaths | undefined`.
 */
export const CODING_AGENT_ARTEFACT_PATHS: Record<
  MultiFileCodingAgent,
  CodingAgentArtefactPaths
> &
  Partial<Record<CodingAgent, CodingAgentArtefactPaths>> = {
  claude: {
    command: '.claude/commands/',
    standard: '.claude/rules/',
    skill: '.claude/skills/',
  },
  claude_plugin: {
    command: '',
    standard: '',
    skill: '',
  },
  cursor: {
    command: '.cursor/commands/',
    standard: '.cursor/rules/',
    skill: '.cursor/skills/',
  },
  copilot: {
    command: '.github/prompts/',
    standard: '.github/instructions/',
    skill: '.github/skills/',
  },
  continue: {
    command: '.continue/prompts/',
    standard: '.continue/rules/',
    skill: '',
  },
  packmind: {
    command: '.packmind/commands/',
    standard: '.packmind/standards/',
    skill: '',
  },
  gitlab_duo: {
    command: '',
    standard: '',
    skill: '.gitlab/duo/skills/',
  },
  opencode: {
    command: '.opencode/commands/',
    standard: '',
    skill: '.opencode/skills/',
  },
  codex: {
    command: '',
    standard: '',
    skill: '.agents/skills/',
  },
  kiro: {
    command: '',
    standard: '.kiro/steering/',
    skill: '.kiro/skills/',
  },
};
