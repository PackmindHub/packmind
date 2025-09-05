import { PackmindLogger, HexaRegistry } from '@packmind/shared';
import { DataSource, Repository } from 'typeorm';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { GitHexa } from '@packmind/git';
import { RecipesHexa } from '@packmind/recipes';
import { StandardsHexa } from '@packmind/standards';
import { RecipesDeploymentRepository } from './infra/repositories/RecipesDeploymentRepository';
import { StandardsDeploymentRepository } from './infra/repositories/StandardsDeploymentRepository';
import { IRecipesDeploymentRepository } from './domain/repositories/IRecipesDeploymentRepository';
import { IStandardsDeploymentRepository } from './domain/repositories/IStandardsDeploymentRepository';
import { RecipesDeploymentSchema } from './infra/schemas/RecipesDeploymentSchema';
import { StandardsDeploymentSchema } from './infra/schemas/StandardsDeploymentSchema';
import { RecipesDeployment } from './domain/entities/RecipesDeployment';
import { StandardsDeployment } from './domain/entities/StandardsDeployment';

export class DeploymentsHexaFactory {
  public repositories: {
    recipesDeployment: IRecipesDeploymentRepository;
    standardsDeployment: IStandardsDeploymentRepository;
  };

  public services: {
    git: GitHexa;
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
    };

    // Get GitHexa from registry
    const gitHexa = registry.get(GitHexa);
    if (!gitHexa) {
      throw new Error('GitHexa not found in registry');
    }

    // Initialize services
    this.services = {
      git: gitHexa,
    };

    // Get RecipesHexa from registry
    const recipesHexa = registry.get(RecipesHexa);
    if (!recipesHexa) {
      throw new Error('RecipesHexa not found in registry');
    }

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
