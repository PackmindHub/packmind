import { AGENT_SKILL_PATHS as CENTRALIZED_SKILL_PATHS } from '@packmind/coding-agent';

/**
 * Local CLI agent type for skill management commands.
 * Maps to the centralized CodingAgent type:
 * - 'claude' -> 'claude'
 * - 'github' -> 'copilot'
 */
export type AgentType = 'claude' | 'github';

/**
 * Skill directory paths for supported agents.
 * Uses centralized AGENT_SKILL_PATHS from @packmind/coding-agent.
 */
export const AGENT_SKILL_PATHS: Record<AgentType, string> = {
  claude: CENTRALIZED_SKILL_PATHS.claude!,
  github: CENTRALIZED_SKILL_PATHS.copilot!,
};

export const ALL_AGENTS: AgentType[] = ['claude', 'github'];
