import { PackmindLogger } from '@packmind/logger';
import {
  BaseHexa,
  BaseHexaOpts,
  HexaRegistry,
  JobsService,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  IDeploymentPort,
  IDeploymentPortName,
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
  private readonly adapter: RecipesAdapter;
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

      // Create adapter in constructor - dependencies will be injected in initialize()
      this.logger.debug('Creating RecipesAdapter');
      this.adapter = new RecipesAdapter(this.recipesServices, this.logger);

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
   *
   * Note: This may be called twice due to circular dependency with DeploymentsHexa.
   * The first call initializes with placeholder deploymentPort, the second call
   * updates with the real deploymentPort via setDeploymentPort().
   */
  public async initialize(registry: HexaRegistry): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('RecipesHexa already initialized');
      return;
    }

    this.logger.info('Initializing RecipesHexa (adapter retrieval phase)');

    try {
      // Get all required ports
      const gitPort = registry.getAdapter<IGitPort>(IGitPortName);
      const accountsPort =
        registry.getAdapter<IAccountsPort>(IAccountsPortName);
      const spacesPort = registry.getAdapter<ISpacesPort>(ISpacesPortName);

      // Get deployment port - this will be updated later via setDeploymentPort()
      // due to circular dependency with DeploymentsHexa
      let deploymentPort: IDeploymentPort;
      try {
        deploymentPort =
          registry.getAdapter<IDeploymentPort>(IDeploymentPortName);
      } catch {
        this.logger.warn(
          'DeploymentPort not yet available - will be set via setDeploymentPort()',
        );
        // Create a stub deployment port that will be replaced
        deploymentPort = {} as IDeploymentPort;
      }

      // Get JobsService
      const jobsService = registry.getService(JobsService);

      // Initialize adapter with all dependencies
      // The adapter will build and register delayed jobs internally
      await this.adapter.initialize({
        [IGitPortName]: gitPort,
        [IDeploymentPortName]: deploymentPort,
        [IAccountsPortName]: accountsPort,
        [ISpacesPortName]: spacesPort,
        jobsService,
      });

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
   * Set the deployment port after initialization to avoid circular dependencies.
   * This is called by the application after DeploymentsHexa is initialized.
   *
   * According to the adapter standardization plan, we reinitialize the adapter
   * with the updated deployment port.
   */
  public async setDeploymentPort(
    registry: HexaRegistry,
    deploymentPort: IDeploymentPort,
  ): Promise<void> {
    this.logger.info('Updating deployment port and reinitializing adapter');

    try {
      // Get all ports again (they should all be available now)
      const gitPort = registry.getAdapter<IGitPort>(IGitPortName);
      const accountsPort =
        registry.getAdapter<IAccountsPort>(IAccountsPortName);
      const spacesPort = registry.getAdapter<ISpacesPort>(ISpacesPortName);

      // Get JobsService
      const jobsService = registry.getService(JobsService);

      // Reinitialize adapter with updated ports
      // The adapter will rebuild delayed jobs with the real deployment port
      await this.adapter.initialize({
        [IGitPortName]: gitPort,
        [IDeploymentPortName]: deploymentPort,
        [IAccountsPortName]: accountsPort,
        [ISpacesPortName]: spacesPort,
        jobsService,
      });

      this.logger.info(
        'Deployment port updated and adapter reinitialized successfully',
      );
    } catch (error) {
      this.logger.error('Failed to update deployment port', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
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
   */
  public getAdapter(): IRecipesPort {
    return this.adapter.getPort();
  }

  /**
   * Get the port name for this hexa.
   */
  public getPortName(): string {
    return IRecipesPortName;
  }
}
