import { PackmindLogger } from '@packmind/logger';
import { IGitPort, RenderModeConfiguration, Target } from '@packmind/types';
import { DataSource, Repository } from 'typeorm';
import { IDeploymentsServices } from './application/IDeploymentsServices';
import { DeploymentsServices } from './application/services/DeploymentsServices';
import { RecipesDeployment } from './domain/entities/RecipesDeployment';
import { StandardsDeployment } from './domain/entities/StandardsDeployment';
import { IRecipesDeploymentRepository } from './domain/repositories/IRecipesDeploymentRepository';
import { IRenderModeConfigurationRepository } from './domain/repositories/IRenderModeConfigurationRepository';
import { IStandardsDeploymentRepository } from './domain/repositories/IStandardsDeploymentRepository';
import { ITargetRepository } from './domain/repositories/ITargetRepository';
import { RecipesDeploymentRepository } from './infra/repositories/RecipesDeploymentRepository';
import { RenderModeConfigurationRepository } from './infra/repositories/RenderModeConfigurationRepository';
import { StandardsDeploymentRepository } from './infra/repositories/StandardsDeploymentRepository';
import { TargetRepository } from './infra/repositories/TargetRepository';
import { RecipesDeploymentSchema } from './infra/schemas/RecipesDeploymentSchema';
import { RenderModeConfigurationSchema } from './infra/schemas/RenderModeConfigurationSchema';
import { StandardsDeploymentSchema } from './infra/schemas/StandardsDeploymentSchema';
import { TargetSchema } from './infra/schemas/TargetSchema';

export class DeploymentsHexaFactory {
  public repositories: {
    recipesDeployment: IRecipesDeploymentRepository;
    standardsDeployment: IStandardsDeploymentRepository;
    target: ITargetRepository;
    renderModeConfiguration: IRenderModeConfigurationRepository;
  };

  public services: {
    git: IGitPort;
    deployments: IDeploymentsServices;
  };

  constructor(
    logger: PackmindLogger,
    dataSource: DataSource,
    gitPort?: IGitPort,
  ) {
    // Initialize repositories with proper DataSource that has schemas registered
    this.repositories = {
      recipesDeployment: new RecipesDeploymentRepository(
        dataSource.getRepository(
          RecipesDeploymentSchema,
        ) as Repository<RecipesDeployment>,
        logger,
      ),
      standardsDeployment: new StandardsDeploymentRepository(
        dataSource.getRepository(
          StandardsDeploymentSchema,
        ) as Repository<StandardsDeployment>,
        logger,
      ),
      target: new TargetRepository(
        dataSource.getRepository(TargetSchema) as Repository<Target>,
        logger,
      ),
      renderModeConfiguration: new RenderModeConfigurationRepository(
        dataSource.getRepository(
          RenderModeConfigurationSchema,
        ) as Repository<RenderModeConfiguration>,
        logger,
      ),
    };

    // Initialize services
    // gitPort may be undefined during construction, will be set during initialization
    // Create a temporary stub if gitPort is not provided
    const tempGitPort = gitPort || ({} as IGitPort);
    this.services = {
      git: tempGitPort,
      deployments: new DeploymentsServices(
        this.repositories.target,
        tempGitPort,
        this.repositories.renderModeConfiguration,
        logger,
      ),
    };
  }
}
