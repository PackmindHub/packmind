export type AgentType = 'claude' | 'github';

export const AGENT_SKILL_PATHS: Record<AgentType, string> = {
  claude: '.claude/skills',
  github: '.github/skills',
};

export const ALL_AGENTS: AgentType[] = ['claude', 'github'];
