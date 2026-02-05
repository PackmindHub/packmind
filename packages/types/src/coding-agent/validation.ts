import { CodingAgent } from './CodingAgent';

/**
 * Array of all valid coding agent values.
 * Keep in sync with the CodingAgent type.
 */
export const VALID_CODING_AGENTS: readonly CodingAgent[] = [
  'packmind',
  'junie',
  'claude',
  'cursor',
  'copilot',
  'agents_md',
  'gitlab_duo',
  'continue',
] as const;

/**
 * Type guard to check if a string is a valid CodingAgent.
 */
export function isValidCodingAgent(value: string): value is CodingAgent {
  return VALID_CODING_AGENTS.includes(value as CodingAgent);
}

/**
 * Validates an unknown value as an array of CodingAgents.
 * Returns the valid agents array if the input is an array with at least some valid values,
 * or null if the input is not an array or undefined.
 * Invalid agent strings are filtered out silently.
 *
 * @param agents - The value to validate
 * @returns Array of valid CodingAgents, or null if input is undefined/not an array
 */
export function validateAgents(agents: unknown): CodingAgent[] | null {
  if (agents === undefined || agents === null) {
    return null;
  }

  if (!Array.isArray(agents)) {
    return null;
  }

  // Filter to only valid agents
  const validAgents = agents.filter(
    (agent): agent is CodingAgent =>
      typeof agent === 'string' && isValidCodingAgent(agent),
  );

  return validAgents;
}

/**
 * Validates agents and returns info about invalid ones for warning purposes.
 *
 * @param agents - The value to validate
 * @returns Object with valid agents and invalid agent strings
 */
export function validateAgentsWithWarnings(agents: unknown): {
  validAgents: CodingAgent[] | null;
  invalidAgents: string[];
} {
  if (agents === undefined || agents === null) {
    return { validAgents: null, invalidAgents: [] };
  }

  if (!Array.isArray(agents)) {
    return { validAgents: null, invalidAgents: [] };
  }

  const validAgents: CodingAgent[] = [];
  const invalidAgents: string[] = [];

  for (const agent of agents) {
    if (typeof agent === 'string') {
      if (isValidCodingAgent(agent)) {
        validAgents.push(agent);
      } else {
        invalidAgents.push(agent);
      }
    }
  }

  return { validAgents, invalidAgents };
}
