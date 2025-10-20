import { RecipesServices } from './application/services/RecipesServices';
import { RecipesRepositories } from './infra/repositories/RecipesRepositories';
import { DataSource } from 'typeorm';
import { RecipeUseCases } from './application/useCases';
import {
  PackmindLogger,
  IDeploymentPort,
  HexaRegistry,
} from '@packmind/shared';
import { GitHexa } from '@packmind/git';
import { IRecipesRepositories } from './domain/repositories/IRecipesRepositories';
import { JobsHexa } from '@packmind/jobs';
import { IRecipesDelayedJobs } from './domain/jobs/IRecipesDelayedJobs';
import { UpdateRecipesAndGenerateSummariesJobFactory } from './infra/jobs/UpdateRecipesAndGenerateSummariesJobFactory';
import { DeployRecipesJobFactory } from './infra/jobs/DeployRecipesJobFactory';
import type { RecipesHexa } from './RecipesHexa';

const origin = 'RecipesHexaFactory';

export class RecipesHexaFactory {
  private readonly recipesRepositories: IRecipesRepositories;
  public readonly recipesServices: RecipesServices;
  private readonly gitHexa: GitHexa;
  public readonly useCases: RecipeUseCases;
  private recipesDelayedJobs: IRecipesDelayedJobs | null = null;
  private isInitialized = false;
  private recipesHexa: RecipesHexa | null = null;
  private deploymentPort?: IDeploymentPort;

  constructor(
    dataSource: DataSource,
    private readonly registry: HexaRegistry,
    gitHexa: GitHexa,
    deploymentPort?: IDeploymentPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.deploymentPort = deploymentPort;
    this.logger.info('Constructing RecipesHexaFactory');

    try {
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      this.recipesRepositories = new RecipesRepositories(dataSource);
      this.recipesServices = new RecipesServices(
        this.recipesRepositories,
        this.logger,
      );

      this.logger.debug('Storing GitHexa reference');
      this.gitHexa = gitHexa;

      this.logger.debug('Creating RecipeUseCases');
      this.useCases = new RecipeUseCases(
        this.recipesServices,
        this.gitHexa,
        deploymentPort,
        this.logger,
      );

      this.logger.info('RecipesHexaFactory construction completed');
    } catch (error) {
      this.logger.error('Failed to construct RecipesHexaFactory', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Set RecipesHexa reference for webhook use cases to enable delayed job access
   */
  public setRecipesHexa(recipesHexa: RecipesHexa): void {
    this.recipesHexa = recipesHexa;
    this.useCases.setRecipesHexa(recipesHexa);
  }

  /**
   * Async initialization phase - must be called after construction.
   * This initializes delayed jobs and async dependencies.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('RecipesHexaFactory already initialized');
      return;
    }

    this.logger.info('Initializing RecipesHexaFactory (async phase)');

    try {
      if (this.deploymentPort) {
        this.logger.debug('Building recipes delayed jobs');
        const jobsHexa = this.registry.get(JobsHexa);
        this.recipesDelayedJobs = await this.buildRecipesDelayedJobs(jobsHexa);
      } else {
        this.logger.warn(
          'Deployment port not available, skipping delayed jobs initialization',
        );
      }

      this.isInitialized = true;
      this.logger.info('RecipesHexaFactory initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize RecipesHexaFactory', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Build and register all recipes delayed jobs
   */
  private async buildRecipesDelayedJobs(
    jobsHexa: JobsHexa,
  ): Promise<IRecipesDelayedJobs> {
    this.logger.info('Building recipes delayed jobs');

    if (!this.deploymentPort) {
      throw new Error(
        'Deployment port is required for delayed jobs initialization',
      );
    }

    // Create UpdateRecipesAndGenerateSummaries job factory
    const updateRecipesJobFactory =
      new UpdateRecipesAndGenerateSummariesJobFactory(
        this.recipesServices.getRecipeService(),
        this.recipesServices.getRecipeVersionService(),
        this.recipesServices.getRecipeSummaryService(),
      );
    await updateRecipesJobFactory.createQueue();

    // Create DeployRecipes job factory
    const deployRecipesJobFactory = new DeployRecipesJobFactory(
      this.deploymentPort,
    );
    await deployRecipesJobFactory.createQueue();

    // Register job factories with JobsHexa
    this.logger.debug(
      'Registering UpdateRecipesAndGenerateSummaries job queue',
    );
    jobsHexa.registerJobQueue(
      updateRecipesJobFactory.getQueueName(),
      updateRecipesJobFactory,
    );

    this.logger.debug('Registering DeployRecipes job queue');
    jobsHexa.registerJobQueue(
      deployRecipesJobFactory.getQueueName(),
      deployRecipesJobFactory,
    );

    this.logger.info('Recipes delayed jobs built and registered successfully');

    return {
      updateRecipesAndGenerateSummariesDelayedJob:
        updateRecipesJobFactory.getDelayedJob(),
      deployRecipesDelayedJob: deployRecipesJobFactory.getDelayedJob(),
    };
  }

  /**
   * Get the delayed jobs for accessing job queues
   */
  public getRecipesDelayedJobs(): IRecipesDelayedJobs {
    if (!this.recipesDelayedJobs) {
      throw new Error(
        'Recipes delayed jobs not initialized. Call initialize() first or ensure deployment port is available.',
      );
    }
    return this.recipesDelayedJobs;
  }

  /**
   * Update the deployment port for webhook use cases
   */
  updateDeploymentPort(deploymentPort: IDeploymentPort): void {
    this.logger.info('Updating deployment port');
    // Store the deployment port first before building delayed jobs
    this.deploymentPort = deploymentPort;
    this.useCases.updateDeploymentPort(deploymentPort);

    // Build delayed jobs asynchronously
    const jobsHexa = this.registry.get(JobsHexa);
    this.buildRecipesDelayedJobs(jobsHexa)
      .then((recipesDelayedJobs) => {
        this.recipesDelayedJobs = recipesDelayedJobs;
        this.logger.info(
          'Recipes delayed jobs initialized after deployment port update',
        );
      })
      .catch((error) => {
        this.logger.error('Failed to build recipes delayed jobs', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
  }
}
