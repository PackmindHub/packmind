import { AGENT_SKILL_PATHS } from '@packmind/coding-agent';

/**
 * CLI agent type for skill management commands.
 * Maps to the centralized CodingAgent type:
 * - 'claude' -> 'claude'
 * - 'github' -> 'copilot'
 */
export type CliAgentType = 'claude' | 'github';

export const ALL_CLI_AGENTS: CliAgentType[] = ['claude', 'github'];

/**
 * Maps CLI agent type to the skill path from centralized config.
 * CLI uses 'github' but the centralized config uses 'copilot'.
 */
export function getSkillPathForAgent(cliAgent: CliAgentType): string {
  const codingAgent = cliAgent === 'github' ? 'copilot' : cliAgent;
  const path = AGENT_SKILL_PATHS[codingAgent];
  if (path === null) {
    throw new Error(`Agent ${cliAgent} does not support skills`);
  }
  return path;
}
