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
   * Get the file path where the agent's configuration is stored
   * @param agent The coding agent
   * @returns The file path (e.g., "CLAUDE.md" for claude)
   */
  getAgentFilePath(agent: CodingAgent): string;

  /**
   * Get the directory path where agent skills are stored
   * @param agent The coding agent
   * @returns The skill directory path or null if the agent doesn't support skills
   */
  getAgentSkillPath(agent: CodingAgent): string | null;

  /**
   * Get all supported coding agents
   * @returns Array of supported coding agents
   */
  getSupportedAgents(): CodingAgent[];

  /**
   * Get the deployer registry for direct access to coding agent deployers
   * Used for advanced deployment scenarios
   * @deprecated Use deployArtifactsForAgents or generateRemovalUpdatesForAgents instead
   * @returns The coding agent deployer registry
   */
  getDeployerRegistry(): ICodingAgentDeployerRegistry;
}
