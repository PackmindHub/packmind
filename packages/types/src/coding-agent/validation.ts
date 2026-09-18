import { CodingAgent } from './CodingAgent';

/** Must be kept in sync by hand with the `CodingAgent` union. */
export const VALID_CODING_AGENTS: readonly CodingAgent[] = [
  'packmind',
  'junie',
  'claude',
  'claude_plugin',
  'cursor',
  'copilot',
  'agents_md',
  'gitlab_duo',
  'continue',
  'opencode',
  'codex',
  'kiro',
] as const;

/** Always included in any agent configuration; see normalizeCodingAgents. */
export const REQUIRED_CODING_AGENT: CodingAgent = 'packmind';

export function isValidCodingAgent(value: string): value is CodingAgent {
  return VALID_CODING_AGENTS.includes(value as CodingAgent);
}

/**
 * `validAgents` is `null` — not `[]` — when the input is absent or not an
 * array, so a caller can tell "nothing was configured" from "everything
 * configured was rejected". Non-string entries are dropped without being
 * reported in `invalidAgents`.
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

/**
 * Adds `packmind` if absent and drops duplicates, otherwise preserving the
 * caller's order. When added, `packmind` is prepended rather than appended.
 */
export function normalizeCodingAgents(agents: CodingAgent[]): CodingAgent[] {
  const seen = new Set<CodingAgent>();
  const result: CodingAgent[] = [];

  if (!agents.includes(REQUIRED_CODING_AGENT)) {
    result.push(REQUIRED_CODING_AGENT);
    seen.add(REQUIRED_CODING_AGENT);
  }

  for (const agent of agents) {
    if (!seen.has(agent)) {
      seen.add(agent);
      result.push(agent);
    }
  }

  return result;
}
