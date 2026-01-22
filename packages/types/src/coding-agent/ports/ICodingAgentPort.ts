import {
  RenderArtifactsCommand,
  RenderArtifactsResponse,
  DeployArtifactsForAgentsCommand,
  DeployArtifactsForAgentsResponse,
  GenerateRemovalUpdatesCommand,
  GenerateRemovalUpdatesResponse,
} from '../contracts';
import { ICodingAgentDeployerRegistry } from '../ICodingAgentDeployerRegistry';
import { CodingAgent } from '../CodingAgent';

export const ICodingAgentPortName = 'ICodingAgentPort' as const;

export interface ICodingAgentPort {
  renderArtifacts(
    command: RenderArtifactsCommand,
  ): Promise<RenderArtifactsResponse>;

  /**
   * Deploy artifacts (recipes, standards, skills) for multiple coding agents
   * This is the unified entry point for deployment operations
   */
  deployArtifactsForAgents(
    command: DeployArtifactsForAgentsCommand,
  ): Promise<DeployArtifactsForAgentsResponse>;

  /**
   * Generate file updates for removed artifacts
   * Computes which files need to be deleted or updated when artifacts are removed
   */
  generateRemovalUpdatesForAgents(
    command: GenerateRemovalUpdatesCommand,
  ): Promise<GenerateRemovalUpdatesResponse>;

  /**
   * Get the deployer registry for direct access to coding agent deployers
   * Used for advanced deployment scenarios
   * @deprecated Use deployArtifactsForAgents or generateRemovalUpdatesForAgents instead
   * @returns The coding agent deployer registry
   */
  getDeployerRegistry(): ICodingAgentDeployerRegistry;

  /**
   * Get the skills folder paths for multiple coding agents
   * @param agents Array of coding agents to get skill folder paths for
   * @returns Map of agent to skill folder path (undefined if agent doesn't support skills)
   */
  getSkillsFolderPathForAgents(
    agents: CodingAgent[],
  ): Map<CodingAgent, string | undefined>;
}
