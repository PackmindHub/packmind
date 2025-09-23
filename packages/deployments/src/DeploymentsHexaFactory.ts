import { PackmindLogger, HexaRegistry } from '@packmind/shared';
import { DataSource, Repository } from 'typeorm';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { GitHexa } from '@packmind/git';
import { StandardsHexa } from '@packmind/standards';
import { RecipesDeploymentRepository } from './infra/repositories/RecipesDeploymentRepository';
import { StandardsDeploymentRepository } from './infra/repositories/StandardsDeploymentRepository';
import { TargetRepository } from './infra/repositories/TargetRepository';
import { IRecipesDeploymentRepository } from './domain/repositories/IRecipesDeploymentRepository';
import { IStandardsDeploymentRepository } from './domain/repositories/IStandardsDeploymentRepository';
import { ITargetRepository } from './domain/repositories/ITargetRepository';
import { RecipesDeploymentSchema } from './infra/schemas/RecipesDeploymentSchema';
import { StandardsDeploymentSchema } from './infra/schemas/StandardsDeploymentSchema';
import { TargetSchema } from './infra/schemas/TargetSchema';
import { RecipesDeployment } from './domain/entities/RecipesDeployment';
import { StandardsDeployment } from './domain/entities/StandardsDeployment';
import { Target } from '@packmind/shared';
import { DeploymentsServices } from './application/services/DeploymentsServices';
import { IDeploymentsServices } from './application/IDeploymentsServices';

export class DeploymentsHexaFactory {
  public repositories: {
    recipesDeployment: IRecipesDeploymentRepository;
    standardsDeployment: IStandardsDeploymentRepository;
    target: ITargetRepository;
  };

  public services: {
    git: GitHexa;
    deployments: IDeploymentsServices;
  };

  constructor(
    logger: PackmindLogger,
    dataSource: DataSource,
    registry: HexaRegistry,
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
    };

    // Get GitHexa from registry
    const gitHexa = registry.get(GitHexa);
    if (!gitHexa) {
      throw new Error('GitHexa not found in registry');
    }

    // Initialize services
    this.services = {
      git: gitHexa,
      deployments: new DeploymentsServices(
        this.repositories.target,
        gitHexa,
        logger,
      ),
    };

    // RecipesHexa dependency removed - using port pattern to avoid circular dependency

    // Get StandardsHexa from registry
    const standardsHexa = registry.get(StandardsHexa);
    if (!standardsHexa) {
      throw new Error('StandardsHexa not found in registry');
    }

    // Get CodingAgentHexa from registry
    const codingAgentHexa = registry.get(CodingAgentHexa);
    if (!codingAgentHexa) {
      throw new Error('CodingAgentHexa not found in registry');
    }
  }
}
