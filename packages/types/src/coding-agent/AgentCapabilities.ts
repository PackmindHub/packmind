import { CodingAgent } from './CodingAgent';
import { VALID_CODING_AGENTS } from './validation';

export type ArtifactCapability =
  | 'skills'
  | 'standards'
  | 'commands'
  | 'recipes';

export type AgentCapabilityFlags = Record<ArtifactCapability, boolean>;

/**
 * Declares which artifact types each rendering agent can render.
 * Source of truth for CLI capability warnings.
 *
 * Pinned by `agentCapabilitiesPinning.spec.ts` in @packmind/coding-agent
 * to ensure the declarations match each deployer's actual behavior.
 */
export const AGENT_CAPABILITIES: Record<CodingAgent, AgentCapabilityFlags> = {
  packmind: { skills: false, standards: true, commands: true, recipes: true },
  agents_md: {
    skills: false,
    standards: true,
    commands: false,
    recipes: false,
  },
  codex: { skills: false, standards: true, commands: false, recipes: false },
  gitlab_duo: {
    skills: false,
    standards: true,
    commands: false,
    recipes: false,
  },
  claude: { skills: true, standards: true, commands: true, recipes: true },
  cursor: { skills: true, standards: true, commands: true, recipes: true },
  copilot: { skills: true, standards: true, commands: true, recipes: true },
  continue: { skills: true, standards: true, commands: true, recipes: true },
  junie: { skills: true, standards: true, commands: true, recipes: true },
  opencode: { skills: true, standards: true, commands: true, recipes: true },
};

export function hasCapableAgent(
  agents: CodingAgent[],
  capability: ArtifactCapability,
): boolean {
  return agents.some((agent) => AGENT_CAPABILITIES[agent][capability]);
}

export function capableAgentsFor(
  capability: ArtifactCapability,
): CodingAgent[] {
  return VALID_CODING_AGENTS.filter(
    (agent) => AGENT_CAPABILITIES[agent][capability],
  );
}
