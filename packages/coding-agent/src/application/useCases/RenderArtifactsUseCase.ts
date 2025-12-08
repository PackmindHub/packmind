import { PackmindLogger } from '@packmind/logger';
import {
  IRenderArtifactsUseCase,
  RenderArtifactsCommand,
  RenderArtifactsResponse,
} from '@packmind/types';
import { CodingAgentServices } from '../services/CodingAgentServices';

const origin = 'RenderArtifactsUseCase';

export class RenderArtifactsUseCase implements IRenderArtifactsUseCase {
  constructor(
    private readonly codingAgentServices: CodingAgentServices,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: RenderArtifactsCommand,
  ): Promise<RenderArtifactsResponse> {
    this.logger.info('Executing render artifacts use case', {
      recipesCount: command.installed.recipeVersions.length,
      standardsCount: command.installed.standardVersions.length,
      agentsCount: command.codingAgents.length,
      existingFilesCount: command.existingFiles.size,
      organizationId: command.organizationId,
      userId: command.userId,
    });

    try {
      const fileUpdates = await this.codingAgentServices.renderArtifacts(
        command.installed,
        command.removed,
        command.codingAgents,
        command.existingFiles,
      );

      this.logger.info('Successfully rendered artifacts', {
        totalFiles:
          fileUpdates.createOrUpdate.length + fileUpdates.delete.length,
        createOrUpdateFiles: fileUpdates.createOrUpdate.length,
        deleteFiles: fileUpdates.delete.length,
      });

      return fileUpdates;
    } catch (error) {
      this.logger.error('Failed to render artifacts', {
        error: error instanceof Error ? error.message : String(error),
        recipesCount: command.installed.recipeVersions.length,
        standardsCount: command.installed.standardVersions.length,
        agentsCount: command.codingAgents.length,
      });
      throw error;
    }
  }
}
