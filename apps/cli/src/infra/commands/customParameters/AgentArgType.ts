import { Type } from 'cmd-ts';
import { AgentType } from '../../../application/services/AgentDetectionService';

const VALID_AGENTS = ['copilot', 'cursor', 'claude', 'continue'] as const;
type AgentArg = (typeof VALID_AGENTS)[number];
export const agentArgToType: Record<AgentArg, AgentType> = {
  copilot: 'vscode',
  cursor: 'cursor',
  claude: 'claude',
  continue: 'continue',
};
export const AgentArgType: Type<string, AgentArg> = {
  from: async (input) => {
    const normalized = input.toLowerCase() as AgentArg;
    if (VALID_AGENTS.includes(normalized)) {
      return normalized;
    }
    throw new Error(
      `Invalid agent '${input}'. Valid options are: ${VALID_AGENTS.join(', ')}`,
    );
  },
};
