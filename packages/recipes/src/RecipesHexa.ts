import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, HexaRegistry, BaseHexaOpts } from '@packmind/node-utils';
import { IDeploymentPort, IRecipesPort } from '@packmind/types';
import { RecipesHexaFactory } from './RecipesHexaFactory';
import { GitHexa } from '@packmind/git';

const origin = 'RecipesHexa';

/**
 * RecipesHexa - Facade for the Recipes domain following the new Hexa pattern.
 *
 * This class serves as the main entry point for recipes-related functionality.
 * It holds the RecipesHexa instance and exposes use cases as a clean facade.
 *
 * The Hexa pattern separates concerns:
 * - RecipesHexaFactory: Handles dependency injection and service instantiation
 * - RecipesHexa: Serves as use case facade and integration point with other domains
 *
 * Uses the DataSource provided through the HexaRegistry for database operations.
 * Also integrates with GitHexa for git-related recipe operations.
 */
export class RecipesHexa extends BaseHexa<BaseHexaOpts, IRecipesPort> {
  private readonly hexa: RecipesHexaFactory;
  private _deploymentPort: IDeploymentPort | undefined | null = undefined;
  private isInitialized = false;

  constructor(
    registry: HexaRegistry,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(registry, opts);

    this.logger.info('Constructing RecipesHexa');

    try {
      // Get the DataSource from the registry
      const dataSource = registry.getDataSource();
      this.logger.debug('Retrieved DataSource from registry');

      const gitHexa = registry.get(GitHexa);
      const gitPort = gitHexa.getAdapter();

      // Initialize the hexagon with the shared DataSource
      // DeploymentPort will be resolved lazily to avoid circular dependencies
      this.hexa = new RecipesHexaFactory(
        dataSource,
        registry,
        gitPort,
        undefined,
        gitHexa, // Pass gitHexa for addFetchFileContentJob() - not in port
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
   * Async initialization phase - must be called after construction.
   * This initializes delayed jobs and async dependencies.
   */
  public override async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('RecipesHexa already initialized');
      return;
    }

    this.logger.info('Initializing RecipesHexa (async phase)');

    try {
      // Initialize the factory first
      await this.hexa.initialize();

      // Set delayed jobs on adapter if available (they're only created if deployment port is set)
      // Delayed jobs will be set later when deployment port is available via setDeploymentPort()
      try {
        const delayedJobs = this.getRecipesDelayedJobs();
        this.hexa.useCases.setRecipesDelayedJobs(delayedJobs);
      } catch {
        // Delayed jobs not available yet (deployment port not set) - will be set later
        this.logger.debug(
          'Delayed jobs not available yet, will be set when deployment port is available',
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
   * Internal helper to ensure initialization before use case access
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        'RecipesHexa not initialized. Call initialize() before using delayed jobs.',
      );
    }
  }

  /**
   * Get the delayed jobs for accessing job queues
   */
  public getRecipesDelayedJobs() {
    // Check if factory is initialized (delayed jobs are created during factory initialization)
    if (!this.hexa.getIsInitialized()) {
      throw new Error(
        'RecipesHexaFactory not initialized. Call initialize() before using delayed jobs.',
      );
    }
    return this.hexa.getRecipesDelayedJobs();
  }

  /**
   * Set the deployment port after initialization to avoid circular dependencies
   * This will trigger async initialization if not already initialized
   */
  public async setDeploymentPort(
    deploymentPort: IDeploymentPort,
  ): Promise<void> {
    this._deploymentPort = deploymentPort;
    // Update the use cases with the new deployment port (this will build delayed jobs)
    await this.hexa.updateDeploymentPort(deploymentPort);

    // Initialize delayed jobs if not already initialized
    if (!this.isInitialized) {
      this.logger.info(
        'Deployment port set, triggering RecipesHexa initialization',
      );
      await this.initialize();
    } else {
      // If already initialized, delayed jobs are already set by updateDeploymentPort()
      // Just ensure they're set on the adapter
      try {
        const delayedJobs = this.hexa.getRecipesDelayedJobs();
        this.hexa.useCases.setRecipesDelayedJobs(delayedJobs);
      } catch {
        // Delayed jobs not available - updateDeploymentPort should have set them
        this.logger.debug(
          'Delayed jobs not available after deployment port update',
        );
      }
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
    return this.hexa.useCases;
  }
}
