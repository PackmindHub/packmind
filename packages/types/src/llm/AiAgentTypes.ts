export type AiAgentType =
  | 'cursor'
  | 'copilot'
  | 'junie'
  | 'claude_code'
  | 'agents_md';
export const AiAgentTypes: Record<AiAgentType, AiAgentType> = {
  cursor: 'cursor',
  copilot: 'copilot',
  junie: 'junie',
  claude_code: 'claude_code',
  agents_md: 'agents_md',
};

export type AiAgentConfigFile = {
  path: string;
  content: string;
  agentType: AiAgentType;
};

export type JunieContentCheckResult = {
  hasPackmindInstructions: boolean;
  existingContent?: string;
  updatedContent: string;
};

export type ClaudeContentCheckResult = {
  hasPackmindInstructions: boolean;
  existingContent?: string;
  updatedContent: string;
};
