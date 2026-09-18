import {
  RenderArtifactsCommand,
  RenderArtifactsResponse,
  DeployArtifactsForAgentsCommand,
  DeployArtifactsForAgentsResponse,
  GenerateAgentCleanupUpdatesCommand,
  GenerateAgentCleanupUpdatesResponse,
  GenerateRemovalUpdatesCommand,
  GenerateRemovalUpdatesResponse,
  PreviewArtifactRenderingCommand,
  PreviewArtifactRenderingResponse,
} from '../contracts';
import { ICodingAgentDeployerRegistry } from '../ICodingAgentDeployerRegistry';
import { CodingAgent } from '../CodingAgent';

export const ICodingAgentPortName = 'ICodingAgentPort' as const;

export interface ICodingAgentPort {
  renderArtifacts(
    command: RenderArtifactsCommand,
  ): Promise<RenderArtifactsResponse>;

  /** The unified entry point for deployment operations. */
  deployArtifactsForAgents(
    command: DeployArtifactsForAgentsCommand,
  ): Promise<DeployArtifactsForAgentsResponse>;

  /** Computes both the deletions and the rewrites a removal implies. */
  generateRemovalUpdatesForAgents(
    command: GenerateRemovalUpdatesCommand,
  ): Promise<GenerateRemovalUpdatesResponse>;

  /** Cleans up agent-specific files when an agent itself is deconfigured. */
  generateAgentCleanupUpdatesForAgents(
    command: GenerateAgentCleanupUpdatesCommand,
  ): Promise<GenerateAgentCleanupUpdatesResponse>;

  /**
   * @deprecated Use deployArtifactsForAgents or generateRemovalUpdatesForAgents instead
   */
  getDeployerRegistry(): ICodingAgentDeployerRegistry;

  /** The map value is `undefined` for an agent that does not support skills. */
  getSkillsFolderPathForAgents(
    agents: CodingAgent[],
  ): Map<CodingAgent, string | undefined>;

  /** Returns the rendered files as a base64-encoded zip. */
  previewArtifactRendering(
    command: PreviewArtifactRenderingCommand,
  ): Promise<PreviewArtifactRenderingResponse>;
}
