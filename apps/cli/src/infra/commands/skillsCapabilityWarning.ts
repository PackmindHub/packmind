import { CodingAgent, hasCapableAgent } from '@packmind/types';
import { formatCommand } from '../utils/consoleLogger';

export function configuredAgentsSupportSkills(
  configuredAgents: CodingAgent[],
): boolean {
  return hasCapableAgent(configuredAgents, 'skills');
}

export function buildSkillsSkippedWarning(
  configuredAgents: CodingAgent[],
): string {
  const configHint = formatCommand('packmind-cli config agents');

  if (configuredAgents.length === 0) {
    return `Skipping default skills — no coding agents are configured. Run ${configHint} to add one (e.g. claude).`;
  }

  return `Skipping default skills — your configured agents (${configuredAgents.join(', ')}) do not support skills. Run ${configHint} to add a capable agent (e.g. claude).`;
}
