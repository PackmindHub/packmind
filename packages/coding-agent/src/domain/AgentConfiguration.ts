import { CodingAgent } from '@packmind/types';

/**
 * Centralized configuration for coding agent configuration file paths (e.g. CLAUDE.md, .cursorrules).
 * For artefact directory paths (commands, standards, skills), see CODING_AGENT_ARTEFACT_PATHS in @packmind/types.
 */
export const AGENT_FILE_PATHS: Record<CodingAgent, string> = {
  claude: 'CLAUDE.md',
  agents_md: 'AGENTS.md',
  cursor: '.cursor/rules/packmind/recipes-index.mdc',
  copilot: '.github/copilot-instructions.md',
  junie: '.junie/guidelines.md',
  packmind: '.packmind.md',
  gitlab_duo: '.gitlab/duo/chat-rules.md',
  continue: '.continue/rules/packmind-recipes-index.md',
};
