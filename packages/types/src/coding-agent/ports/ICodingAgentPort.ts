import {
  PrepareRecipesDeploymentCommand,
  PrepareRecipesDeploymentResponse,
  PrepareStandardsDeploymentCommand,
  PrepareStandardsDeploymentResponse,
  RenderArtifactsCommand,
  RenderArtifactsResponse,
} from '../contracts';
import { ICodingAgentDeployerRegistry } from '../ICodingAgentDeployerRegistry';

export const ICodingAgentPortName = 'ICodingAgentPort' as const;

export interface ICodingAgentPort {
  prepareRecipesDeployment(
    command: PrepareRecipesDeploymentCommand,
  ): Promise<PrepareRecipesDeploymentResponse>;

  prepareStandardsDeployment(
    command: PrepareStandardsDeploymentCommand,
  ): Promise<PrepareStandardsDeploymentResponse>;

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
