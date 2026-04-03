import { restPositionals } from 'cmd-ts';
import { AgentArgType } from './AgentArgType';

export const agentNamesPositional = restPositionals({
  type: AgentArgType,
  displayName: 'agents',
  description: 'Agent identifiers (e.g. claude cursor)',
});
