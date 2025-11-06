import { PackmindLogger } from '@packmind/logger';
import {
  IPrepareStandardsDeploymentUseCase,
  PrepareStandardsDeploymentCommand,
} from '../../domain/useCases/IPrepareStandardsDeploymentUseCase';
import { FileUpdates } from '../../domain/entities/FileUpdates';
import { CodingAgentServices } from '../services/CodingAgentServices';

const origin = 'PrepareStandardsDeploymentUseCase';

export class PrepareStandardsDeploymentUseCase
  implements IPrepareStandardsDeploymentUseCase
{
  constructor(
    private readonly codingAgentServices: CodingAgentServices,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: PrepareStandardsDeploymentCommand,
  ): Promise<FileUpdates> {
    this.logger.info('Executing prepare standards deployment use case', {
      standardsCount: command.standardVersions.length,
      agentsCount: command.codingAgents.length,
      gitRepoId: command.gitRepo.id,
    });

    try {
      const fileUpdates =
        await this.codingAgentServices.prepareStandardsDeployment(
          command.standardVersions,
          command.gitRepo,
          command.targets,
          command.codingAgents,
        );

      this.logger.info('Successfully prepared standards deployment', {
        totalFiles:
          fileUpdates.createOrUpdate.length + fileUpdates.delete.length,
        createOrUpdateFiles: fileUpdates.createOrUpdate.length,
        deleteFiles: fileUpdates.delete.length,
      });

      return fileUpdates;
    } catch (error) {
      this.logger.error('Failed to prepare standards deployment', {
        error: error instanceof Error ? error.message : String(error),
        standardsCount: command.standardVersions.length,
        agentsCount: command.codingAgents.length,
      });
      throw error;
    }
  }
}
