import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import {
  IDeploymentPort,
  IDeploymentPortName,
  ILinterPort,
  ILinterPortName,
  IStandardsPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
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
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing StandardsHexa');

    try {
      // Initialize the hexagon factory with the DataSource
      // Adapter retrieval will be done in initialize(registry)
      this.hexa = new StandardsHexaFactory(this.dataSource, this.logger);
      this.logger.info('StandardsHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct StandardsHexa', {
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
      this.logger.debug('StandardsHexa already initialized');
      return;
    }

    this.logger.info(
      'Initializing StandardsHexa (adapter retrieval and async phase)',
    );

    try {
      // Get LinterHexa adapter for ILinterPort
      // Using getAdapter to avoid circular dependency
      try {
        const linterPort = registry.getAdapter<ILinterPort>(ILinterPortName);
        this.logger.info('LinterAdapter retrieved from LinterHexa');
        // Set linter adapter on services
        this.hexa.setLinterAdapter(linterPort);
      } catch {
        // LinterHexa not available - optional dependency
        this.logger.debug('LinterHexa not available in registry');
      }

      // Get DeploymentsHexa to retrieve deployments query adapter
      // Using getAdapter to avoid circular dependency
      try {
        const deploymentPort =
          registry.getAdapter<IDeploymentPort>(IDeploymentPortName);
        this.setDeploymentsQueryAdapter(deploymentPort);
      } catch {
        // DeploymentsHexa not available - optional dependency
        this.logger.debug('DeploymentsHexa not available in registry');
      }

      await this.hexa.initialize(registry);
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
   * Get the port name for this hexa.
   */
  public getPortName(): string {
    return IStandardsPortName;
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
