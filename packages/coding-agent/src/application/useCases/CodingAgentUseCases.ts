import { PackmindLogger } from '@packmind/logger';
import { CodingAgentServices } from '../services/CodingAgentServices';
import { PrepareRecipesDeploymentUseCase } from './PrepareRecipesDeploymentUseCase';
import { PrepareStandardsDeploymentUseCase } from './PrepareStandardsDeploymentUseCase';
import { PrepareRecipesDeploymentCommand } from '../../domain/useCases/IPrepareRecipesDeploymentUseCase';
import { PrepareStandardsDeploymentCommand } from '../../domain/useCases/IPrepareStandardsDeploymentUseCase';
import { FileUpdates } from '../../domain/entities/FileUpdates';

const origin = 'CodingAgentUseCases';

export class CodingAgentUseCases {
  private readonly prepareRecipesDeploymentUseCase: PrepareRecipesDeploymentUseCase;
  private readonly prepareStandardsDeploymentUseCase: PrepareStandardsDeploymentUseCase;

  constructor(
    codingAgentServices: CodingAgentServices,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('Initializing CodingAgentUseCases');

    this.prepareRecipesDeploymentUseCase = new PrepareRecipesDeploymentUseCase(
      codingAgentServices,
      this.logger,
    );

    this.prepareStandardsDeploymentUseCase =
      new PrepareStandardsDeploymentUseCase(codingAgentServices, this.logger);

    this.logger.info('CodingAgentUseCases initialized successfully');
  }

  async prepareRecipesDeployment(
    command: PrepareRecipesDeploymentCommand,
  ): Promise<FileUpdates> {
    return this.prepareRecipesDeploymentUseCase.execute(command);
  }

  async prepareStandardsDeployment(
    command: PrepareStandardsDeploymentCommand,
  ): Promise<FileUpdates> {
    return this.prepareStandardsDeploymentUseCase.execute(command);
  }
}
