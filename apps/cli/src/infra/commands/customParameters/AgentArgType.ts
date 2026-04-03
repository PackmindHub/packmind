import { Type } from 'cmd-ts';
import { CodingAgent, CodingAgents } from '@packmind/types';
import { AgentType } from '../../../application/services/AgentDetectionService';

const VALID_AGENTS = Object.keys(CodingAgents).filter(
  (a) => a !== 'packmind',
) as CodingAgent[];

export const agentArgToType: Partial<Record<CodingAgent, AgentType>> = {
  copilot: 'vscode',
  cursor: 'cursor',
  claude: 'claude',
  continue: 'continue',
};
export const AgentArgType: Type<string, CodingAgent> = {
  from: async (input) => {
    const normalized = input.toLowerCase() as CodingAgent;
    if (VALID_AGENTS.includes(normalized)) {
      return normalized;
    }
    throw new Error(
      `Invalid agent '${input}'. Valid options are: ${VALID_AGENTS.join(', ')}`,
    );
  },
};
