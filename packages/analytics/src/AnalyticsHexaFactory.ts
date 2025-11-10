import { DataSource } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { IDeploymentPort, IGitPort, IRecipesPort } from '@packmind/types';
import { RecipeUsageUseCases } from './application/useCases';
import { IRecipesUsageRepositories } from './domain/repositories/IRecipesUsageRepositories';
import { RecipesUsageRepositories } from './infra/repositories/RecipesUsageRepositories';
import { RecipesUsageServices } from './application/services/RecipesUsageServices';

const origin = 'AnalyticsHexaFactory';

export class AnalyticsHexaFactory {
  private recipesPort?: IRecipesPort;
  private readonly gitPort: IGitPort;

  private readonly recipesUsageRepositories: IRecipesUsageRepositories;
  public readonly useCases: RecipeUsageUseCases;
  private deploymentPort?: IDeploymentPort;

  constructor(
    dataSource: DataSource,
    recipesPort: IRecipesPort | undefined,
    gitPort: IGitPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('Initializing AnalyticsHexa');

    try {
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      this.logger.debug('Storing port references');
      this.gitPort = gitPort;
      this.recipesPort = recipesPort;
      this.logger.debug('Ports stored successfully');

      this.logger.debug('Creating RecipeUseCases');
      this.recipesUsageRepositories = new RecipesUsageRepositories(dataSource);
      this.useCases = new RecipeUsageUseCases(
        new RecipesUsageServices(
          this.recipesUsageRepositories,
          this.recipesPort,
          this.logger,
        ),
        this.recipesPort,
        this.gitPort,
        this.deploymentPort,
        this.logger,
      );

      this.logger.info('AnalyticsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize AnalyticsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Set the recipes port after initialization to avoid circular dependencies
   */
  public setRecipesPort(recipesPort: IRecipesPort): void {
    this.recipesPort = recipesPort;
    // Update the use cases with the new recipes port
    this.useCases.setRecipesPort(recipesPort);
  }

  /**
   * Set the deployment port after initialization to avoid circular dependencies
   */
  public setDeploymentPort(deploymentPort: IDeploymentPort): void {
    this.deploymentPort = deploymentPort;
    // Update the use cases with the new deployment port
    this.useCases.setDeploymentPort(deploymentPort);
  }
}
