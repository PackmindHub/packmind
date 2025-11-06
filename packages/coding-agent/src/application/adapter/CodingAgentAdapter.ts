import { PackmindLogger } from '@packmind/logger';
import {
  ICodingAgentPort,
  PrepareRecipesDeploymentCommand,
  PrepareRecipesDeploymentResponse,
  PrepareStandardsDeploymentCommand,
  PrepareStandardsDeploymentResponse,
} from '@packmind/types';
import { CodingAgentServices } from '../services/CodingAgentServices';
import { PrepareRecipesDeploymentUseCase } from '../useCases/PrepareRecipesDeploymentUseCase';
import { PrepareStandardsDeploymentUseCase } from '../useCases/PrepareStandardsDeploymentUseCase';

const origin = 'CodingAgentAdapter';

export class CodingAgentAdapter implements ICodingAgentPort {
  private readonly prepareRecipesDeploymentUseCase: PrepareRecipesDeploymentUseCase;
  private readonly prepareStandardsDeploymentUseCase: PrepareStandardsDeploymentUseCase;

  constructor(
    codingAgentServices: CodingAgentServices,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('Initializing CodingAgentAdapter');

    this.prepareRecipesDeploymentUseCase = new PrepareRecipesDeploymentUseCase(
      codingAgentServices,
      this.logger,
    );

    this.prepareStandardsDeploymentUseCase =
      new PrepareStandardsDeploymentUseCase(codingAgentServices, this.logger);

    this.logger.info('CodingAgentAdapter initialized successfully');
  }

  async prepareRecipesDeployment(
    command: PrepareRecipesDeploymentCommand,
  ): Promise<PrepareRecipesDeploymentResponse> {
    return this.prepareRecipesDeploymentUseCase.execute(command);
  }

  async prepareStandardsDeployment(
    command: PrepareStandardsDeploymentCommand,
  ): Promise<PrepareStandardsDeploymentResponse> {
    return this.prepareStandardsDeploymentUseCase.execute(command);
  }
}
