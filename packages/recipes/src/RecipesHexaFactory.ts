import { RecipesServices } from './application/services/RecipesServices';
import { RecipesRepositories } from './infra/repositories/RecipesRepositories';
import { DataSource } from 'typeorm';
import { RecipeUseCases } from './application/useCases';
import { PackmindLogger, IDeploymentPort } from '@packmind/shared';
import { GitHexa } from '@packmind/git';
import { IRecipesRepositories } from './domain/repositories/IRecipesRepositories';

const origin = 'RecipesHexaFactory';

export class RecipesHexaFactory {
  private readonly recipesRepositories: IRecipesRepositories;
  public readonly recipesServices: RecipesServices;
  private readonly gitHexa: GitHexa;
  public readonly useCases: RecipeUseCases;

  constructor(
    dataSource: DataSource,
    gitHexa: GitHexa,
    deploymentPort?: IDeploymentPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('Initializing RecipesHexa');

    try {
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      this.recipesRepositories = new RecipesRepositories(dataSource);
      this.recipesServices = new RecipesServices(
        this.recipesRepositories,
        this.logger,
      );

      this.logger.debug('Creating GitHexa');
      this.gitHexa = gitHexa;
      this.logger.debug('GitHexa created successfully');

      this.logger.debug('Creating RecipeUseCases');
      this.useCases = new RecipeUseCases(
        this.recipesServices,
        this.gitHexa,
        deploymentPort,
        this.logger,
      );

      this.logger.info('RecipesHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize RecipesHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update the deployment port for webhook use cases
   */
  updateDeploymentPort(deploymentPort: IDeploymentPort): void {
    this.useCases.updateDeploymentPort(deploymentPort);
  }
}
