import { JobsHexa } from '@packmind/jobs';
import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  IDeploymentPort,
  IGitPort,
  IGitPortName,
  IRecipesPort,
  IRecipesPortName,
  ISpacesPort,
  ISpacesPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { RecipesAdapter } from './application/adapter/RecipesAdapter';
import { RecipesServices } from './application/services/RecipesServices';
import { IRecipesDelayedJobs } from './domain/jobs/IRecipesDelayedJobs';
import { DeployRecipesJobFactory } from './infra/jobs/DeployRecipesJobFactory';
import { UpdateRecipesAndGenerateSummariesJobFactory } from './infra/jobs/UpdateRecipesAndGenerateSummariesJobFactory';
import { RecipesRepositories } from './infra/repositories/RecipesRepositories';

const origin = 'RecipesHexa';

/**
 * RecipesHexa - Facade for the Recipes domain following the Hexa pattern.
 *
 * This class serves as the main entry point for recipes-related functionality.
 * It exposes use cases through the adapter and manages the lifecycle of the domain.
 */
export class RecipesHexa extends BaseHexa<BaseHexaOpts, IRecipesPort> {
  private readonly recipesRepositories: RecipesRepositories;
  private readonly recipesServices: RecipesServices;
  private adapter!: RecipesAdapter; // Non-null assertion since initialize() will set it
  private gitPort?: IGitPort;
  private accountsPort?: IAccountsPort;
  private spacesPort?: ISpacesPort | null;
  private _deploymentPort: IDeploymentPort | undefined | null = undefined;
  private recipesDelayedJobs: IRecipesDelayedJobs | null = null;
  private isInitialized = false;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);

    this.logger.info('Constructing RecipesHexa');

    try {
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      // Instantiate repositories and services
      this.recipesRepositories = new RecipesRepositories(dataSource);
      this.recipesServices = new RecipesServices(
        this.recipesRepositories,
        this.logger,
      );

      this.logger.info('RecipesHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct RecipesHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize the hexa with access to the registry for adapter retrieval.
   * This also handles async initialization (delayed jobs, etc.).
   */
  public async initialize(registry: HexaRegistry): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('RecipesHexa already initialized');
      return;
    }

    this.logger.info(
      'Initializing RecipesHexa (adapter retrieval and async phase)',
    );

    try {
      // Get Git port (required) for domain logic
      this.gitPort = registry.getAdapter<IGitPort>(IGitPortName);

      // Get Accounts port (required)
      this.accountsPort = registry.getAdapter<IAccountsPort>(IAccountsPortName);

      // Get spaces port for space validation (optional)
      try {
        this.spacesPort = registry.getAdapter<ISpacesPort>(ISpacesPortName);
      } catch {
        this.logger.warn(
          'SpacesHexa not found in registry - space validation will not be available',
        );
        this.spacesPort = null;
      }

      // Create RecipesAdapter with all dependencies
      this.logger.debug('Creating RecipesAdapter');
      this.adapter = new RecipesAdapter(
        this.recipesServices,
        this.gitPort,
        this._deploymentPort || undefined,
        this.accountsPort,
        this.spacesPort,
        this.logger,
      );

      // Build delayed jobs if deployment port is available
      if (this._deploymentPort) {
        this.logger.debug('Building recipes delayed jobs');
        const jobsHexa = registry.get(JobsHexa);
        this.recipesDelayedJobs = await this.buildRecipesDelayedJobs(jobsHexa);
        this.adapter.setRecipesDelayedJobs(this.recipesDelayedJobs);
      } else {
        this.logger.warn(
          'Deployment port not available, skipping delayed jobs initialization',
        );
      }

      this.isInitialized = true;
      this.logger.info('RecipesHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize RecipesHexa', {
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

    if (!this._deploymentPort) {
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
      this._deploymentPort,
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
   * Internal helper to ensure initialization before use case access
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        'RecipesHexa not initialized. Call initialize() before using.',
      );
    }
  }

  /**
   * Get the delayed jobs for accessing job queues
   */
  public getRecipesDelayedJobs(): IRecipesDelayedJobs {
    this.ensureInitialized();

    if (!this.recipesDelayedJobs) {
      throw new Error(
        'Recipes delayed jobs not initialized. Ensure deployment port is available.',
      );
    }
    return this.recipesDelayedJobs;
  }

  /**
   * Set the deployment port after initialization to avoid circular dependencies
   */
  public async setDeploymentPort(
    registry: HexaRegistry,
    deploymentPort: IDeploymentPort,
  ): Promise<void> {
    this._deploymentPort = deploymentPort;

    // Update the adapter with the new deployment port
    this.adapter.updateDeploymentPort(deploymentPort);

    // Build delayed jobs if not already built
    if (!this.recipesDelayedJobs) {
      this.logger.debug(
        'Building recipes delayed jobs after deployment port set',
      );
      const jobsHexa = registry.get(JobsHexa);
      this.recipesDelayedJobs = await this.buildRecipesDelayedJobs(jobsHexa);
      this.adapter.setRecipesDelayedJobs(this.recipesDelayedJobs);
    }
  }

  /**
   * Destroys the RecipesHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying RecipesHexa');
    // Add any cleanup logic here if needed
    this.logger.info('RecipesHexa destroyed');
  }

  /**
   * Get the Recipes adapter for cross-domain access to recipes data.
   * This adapter implements IRecipesPort and can be injected into other domains.
   * The adapter is available after initialization.
   */
  public getAdapter(): IRecipesPort {
    this.ensureInitialized();
    return this.adapter;
  }

  /**
   * Get the port name for this hexa.
   */
  public getPortName(): string {
    return IRecipesPortName;
  }
}
