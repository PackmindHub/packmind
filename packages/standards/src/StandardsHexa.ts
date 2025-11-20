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
  IEventTrackingPort,
  IEventTrackingPortName,
  ILinterPort,
  ILinterPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { StandardsServices } from './application/services/StandardsServices';
import { StandardsAdapter } from './application/adapter/StandardsAdapter';
import { StandardsRepositories } from './infra/repositories/StandardsRepositories';

const origin = 'StandardsHexa';

/**
 * StandardsHexa - Facade for the Standards domain following the Hexa pattern.
 *
 * This class serves as the main entry point for standards-related functionality.
 * It manages dependency injection, service instantiation, and exposes the adapter.
 *
 * Uses the DataSource provided through the HexaRegistry for database operations.
 */
export class StandardsHexa extends BaseHexa<BaseHexaOpts, StandardsAdapter> {
  public readonly standardsRepositories: StandardsRepositories;
  public readonly standardsServices: StandardsServices;
  private readonly adapter: StandardsAdapter;
  public isInitialized = false;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing StandardsHexa');

    try {
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      // Instantiate repositories
      this.standardsRepositories = new StandardsRepositories(this.dataSource);

      // Instantiate services (linter adapter will be set later)
      this.standardsServices = new StandardsServices(
        this.standardsRepositories,
        this.logger,
      );

      // Create adapter in constructor - dependencies will be injected in initialize()
      this.logger.debug('Creating StandardsAdapter');
      this.adapter = new StandardsAdapter(
        this.standardsServices,
        this.standardsRepositories,
        this.logger,
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
   * Initialize the hexa with access to the registry for adapter retrieval.
   * Delayed jobs are now built internally by the adapter.
   */
  public async initialize(registry: HexaRegistry): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('StandardsHexa already initialized');
      return;
    }

    this.logger.info('Initializing StandardsHexa (adapter retrieval phase)');

    try {
      // Get all required ports (let errors propagate if missing)
      const accountsPort =
        registry.getAdapter<IAccountsPort>(IAccountsPortName);
      const spacesPort = registry.getAdapter<ISpacesPort>(ISpacesPortName);
      const linterPort = registry.getAdapter<ILinterPort>(ILinterPortName);
      const deploymentsPort =
        registry.getAdapter<IDeploymentPort>(IDeploymentPortName);
      const eventTrackingPort = registry.getAdapter<IEventTrackingPort>(
        IEventTrackingPortName,
      );

      this.logger.info('All required ports retrieved from registry');

      // Get JobsService (required) - adapter will build delayed jobs internally
      const jobsService = registry.getService(JobsService);
      if (!jobsService) {
        throw new Error('JobsService not found in registry');
      }

      // Set linter adapter on services for backward compatibility
      this.standardsServices.setLinterAdapter(linterPort);

      // Initialize adapter with all ports and services
      // Delayed jobs are built internally by the adapter
      await this.adapter.initialize({
        [IAccountsPortName]: accountsPort,
        [ISpacesPortName]: spacesPort,
        [ILinterPortName]: linterPort,
        [IDeploymentPortName]: deploymentsPort,
        [IEventTrackingPortName]: eventTrackingPort,
        jobsService,
      });

      this.isInitialized = true;
      this.logger.info('StandardsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize StandardsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get the Standards adapter for cross-domain access to standards data.
   * This adapter implements IStandardsPort and can be injected into other domains.
   * The adapter is available immediately after construction.
   */
  public getAdapter(): StandardsAdapter {
    return this.adapter.getPort() as StandardsAdapter;
  }

  /**
   * Get the port name for this hexa.
   */
  public getPortName(): string {
    return IStandardsPortName;
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
