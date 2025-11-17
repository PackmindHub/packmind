import { RenderArtifactsCommand, RenderArtifactsResponse } from '../contracts';
import { ICodingAgentDeployerRegistry } from '../ICodingAgentDeployerRegistry';

export const ICodingAgentPortName = 'ICodingAgentPort' as const;

export interface ICodingAgentPort {
  renderArtifacts(
    command: RenderArtifactsCommand,
  ): Promise<RenderArtifactsResponse>;

  /**
   * Get the deployer registry for direct access to coding agent deployers
   * Used for advanced deployment scenarios
   * @returns The coding agent deployer registry
   */
  getDeployerRegistry(): ICodingAgentDeployerRegistry;
}
