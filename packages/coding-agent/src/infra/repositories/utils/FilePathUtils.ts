import { CodingAgent } from '../../../domain/CodingAgents';

/**
 * Maps a coding agent to its corresponding file path in the repository
 */
export function getFilePathForAgent(agent: CodingAgent): string {
  const agentToFile: Record<CodingAgent, string> = {
    claude: 'CLAUDE.md',
    agents_md: 'AGENTS.md',
    cursor: '.cursorrules',
    copilot: '.github/copilot-instructions.md',
    junie: '.junie.md',
    packmind: '.packmind.md',
    gitlab_duo: '.gitlab/duo_chat.yml',
  };

  return agentToFile[agent];
}
