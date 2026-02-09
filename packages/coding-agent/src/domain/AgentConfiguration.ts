import { CodingAgent } from '@packmind/types';

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
