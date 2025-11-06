import { PackmindLogger } from '@packmind/logger';
import {
  IPrepareRecipesDeploymentUseCase,
  PrepareRecipesDeploymentCommand,
} from '../../domain/useCases/IPrepareRecipesDeploymentUseCase';
import { FileUpdates } from '../../domain/entities/FileUpdates';
import { CodingAgentServices } from '../services/CodingAgentServices';

const origin = 'PrepareRecipesDeploymentUseCase';

export class PrepareRecipesDeploymentUseCase
  implements IPrepareRecipesDeploymentUseCase
{
  constructor(
    private readonly codingAgentServices: CodingAgentServices,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: PrepareRecipesDeploymentCommand,
  ): Promise<FileUpdates> {
    this.logger.info('Executing prepare recipes deployment use case', {
      recipesCount: command.recipeVersions.length,
      agentsCount: command.codingAgents.length,
      gitRepoId: command.gitRepo.id,
    });

    try {
      const fileUpdates =
        await this.codingAgentServices.prepareRecipesDeployment(
          command.recipeVersions,
          command.gitRepo,
          command.targets,
          command.codingAgents,
        );

      this.logger.info('Successfully prepared recipes deployment', {
        totalFiles:
          fileUpdates.createOrUpdate.length + fileUpdates.delete.length,
        createOrUpdateFiles: fileUpdates.createOrUpdate.length,
        deleteFiles: fileUpdates.delete.length,
      });

      return fileUpdates;
    } catch (error) {
      this.logger.error('Failed to prepare recipes deployment', {
        error: error instanceof Error ? error.message : String(error),
        recipesCount: command.recipeVersions.length,
        agentsCount: command.codingAgents.length,
      });
      throw error;
    }
  }
}
