import { CodingAgent } from './CodingAgents';

/**
 * Centralized configuration for coding agent file paths.
 * This is the single source of truth for where agent configuration files are stored.
 */
export const AGENT_FILE_PATHS: Record<CodingAgent, string> = {
  claude: 'CLAUDE.md',
  agents_md: 'AGENTS.md',
  cursor: '.cursor/rules/packmind/recipes-index.mdc',
  copilot: '.github/copilot-instructions.md',
  junie: '.junie.md',
  packmind: '.packmind.md',
  gitlab_duo: '.gitlab/duo_chat.yml',
  continue: '.continue/rules/packmind-recipes-index.md',
};

/**
 * Centralized configuration for coding agent skill directory paths.
 * Agents that don't support skills have null values.
 */
export const AGENT_SKILL_PATHS: Record<CodingAgent, string | null> = {
  claude: '.claude/skills',
  copilot: '.github/skills',
  agents_md: null,
  cursor: null,
  junie: null,
  packmind: null,
  gitlab_duo: null,
  continue: null,
};

/**
 * List of all supported coding agents.
 */
export const SUPPORTED_AGENTS: CodingAgent[] = [
  'claude',
  'agents_md',
  'cursor',
  'copilot',
  'junie',
  'packmind',
  'gitlab_duo',
  'continue',
];
