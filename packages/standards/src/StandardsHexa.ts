import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import { IDeploymentPort, ILinterPort } from '@packmind/types';
import { StandardsHexaFactory } from './StandardsHexaFactory';
import { StandardsAdapter } from './application/useCases/StandardsAdapter';

const origin = 'StandardsHexa';

/**
 * StandardsHexa - Facade for the Standards domain following the new Hexa pattern.
 *
 * This class serves as the main entry point for standards-related functionality.
 * It holds the StandardsHexaFactory instance and exposes use cases as a clean facade.
 *
 * The Hexa pattern separates concerns:
 * - StandardsHexaFactory: Handles dependency injection and service instantiation
 * - StandardsHexa: Serves as use case facade and integration point with other domains
 *
 * Uses the DataSource provided through the HexaRegistry for database operations.
 * Also integrates with GitHexa for git-related standards operations.
 */
export class StandardsHexa extends BaseHexa<BaseHexaOpts, StandardsAdapter> {
  private readonly hexa: StandardsHexaFactory;
  private standardsAdapter?: StandardsAdapter;
  private isInitialized = false;

  constructor(
    registry: HexaRegistry,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(registry, opts);
    this.logger.info('Constructing StandardsHexa');

    try {
      // Get the DataSource from the registry
      const dataSource = registry.getDataSource();
      this.logger.debug('Retrieved DataSource from registry');

      // Get LinterHexa adapter for ILinterPort (lazy DI per DDD standard)
      // Use getByName to avoid circular dependency at build time
      let linterPort: ILinterPort | undefined;
      try {
        const linterHexa =
          registry.getByName<BaseHexa<BaseHexaOpts, ILinterPort>>('LinterHexa');
        if (linterHexa && typeof linterHexa.getAdapter === 'function') {
          linterPort = linterHexa.getAdapter();
          this.logger.info('LinterAdapter retrieved from LinterHexa');
        }
      } catch (error) {
        this.logger.warn('LinterHexa not available in registry', {
          error: error instanceof Error ? error.message : String(error),
        });
        linterPort = undefined;
      }

      // Initialize the hexagon with the shared DataSource
      this.hexa = new StandardsHexaFactory(
        dataSource,
        registry,
        this.logger,
        linterPort,
      );
      this.logger.info('StandardsHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct StandardsHexa', {
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
      this.logger.debug('StandardsHexa already initialized');
      return;
    }

    this.logger.info('Initializing StandardsHexa (async phase)');

    try {
      await this.hexa.initialize();
      this.standardsAdapter = new StandardsAdapter(this.hexa);
      this.isInitialized = true;
      this.logger.info('StandardsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize StandardsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public getAdapter(): StandardsAdapter {
    // Create adapter lazily if hexa factory is initialized but adapter not yet created
    if (!this.standardsAdapter) {
      // Check if useCases is available (created during initialization)
      // If not, we can't create the adapter yet - it will be created after initialize()
      if (!this.hexa.getIsInitialized() || !this.hexa.useCases) {
        throw new Error(
          'StandardsHexa not initialized. Call initialize() before using.',
        );
      }
      // Hexa factory is initialized and useCases exists, create adapter now
      this.standardsAdapter = new StandardsAdapter(this.hexa);
    }
    return this.standardsAdapter;
  }

  /**
   * Internal helper to ensure initialization before use case access
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        'StandardsHexa not initialized. Call initialize() before using.',
      );
    }
  }

  /**
   * Set the deployments query adapter for accessing deployment data
   */
  public setDeploymentsQueryAdapter(adapter: IDeploymentPort): void {
    this.hexa.setDeploymentsQueryAdapter(adapter);
  }

  public setLinterAdapter(adapter: ILinterPort): void {
    this.hexa.setLinterAdapter(adapter);
  }

  /**
   * Destroys the StandardsHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying StandardsHexa');
    // Add any cleanup logic here if needed
    this.logger.info('StandardsHexa destroyed');
  }
}
