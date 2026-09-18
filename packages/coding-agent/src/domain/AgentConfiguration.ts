import { CodingAgent } from '@packmind/types';

/**
 * Each agent's single configuration file. Artefact *directory* paths
 * (commands, standards, skills) live in `CODING_AGENT_ARTEFACT_PATHS` in
 * `@packmind/types` instead. Empty string means the agent has no such file.
 */
export const AGENT_FILE_PATHS: Record<CodingAgent, string> = {
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
