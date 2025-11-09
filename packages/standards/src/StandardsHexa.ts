import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import {
  IDeploymentPort,
  IDeploymentPortName,
  ILinterPort,
  ILinterPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { StandardsAdapter } from './application/useCases/StandardsAdapter';
import { StandardsServices } from './application/services/StandardsServices';
import { StandardsRepositories } from './infra/repositories/StandardsRepositories';
import { StandardsUseCases } from './application/useCases';
import { AccountsHexa } from '@packmind/accounts';
import { IStandardDelayedJobs } from './domain/jobs/IStandardDelayedJobs';
import { GenerateStandardSummaryJobFactory } from './infra/jobs/GenerateStandardSummaryJobFactory';
import { JobsHexa } from '@packmind/jobs';
import { IStandardsRepositories } from './domain/repositories/IStandardsRepositories';

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
  private readonly standardsRepositories: StandardsRepositories;
  private readonly standardsServices: StandardsServices;
  private useCases!: StandardsUseCases;
  private standardsAdapter?: StandardsAdapter;
  private deploymentsQueryAdapter?: IDeploymentPort;
  private isInitialized = false;

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
      // Get LinterHexa adapter for ILinterPort (optional dependency)
      try {
        const linterPort = registry.getAdapter<ILinterPort>(ILinterPortName);
        this.logger.info('LinterAdapter retrieved from registry');
        this.standardsServices.setLinterAdapter(linterPort);
      } catch {
        this.logger.debug('LinterHexa not available in registry');
      }

      // Get DeploymentsHexa adapter (optional dependency)
      try {
        const deploymentPort =
          registry.getAdapter<IDeploymentPort>(IDeploymentPortName);
        this.deploymentsQueryAdapter = deploymentPort;
        this.logger.info('DeploymentAdapter retrieved from registry');
      } catch {
        this.logger.debug('DeploymentsHexa not available in registry');
      }

      // Get JobsHexa (required)
      const jobsHexa = registry.get(JobsHexa);
      if (!jobsHexa) {
        throw new Error('JobsHexa not found in registry');
      }

      this.logger.debug('Building standards delayed jobs');
      const standardsDelayedJobs = await this.buildStandardsDelayedJobs(
        jobsHexa,
        this.standardsRepositories,
      );

      // Get AccountsHexa adapter (required)
      const accountsHexa = registry.get(AccountsHexa);
      if (!accountsHexa) {
        throw new Error('AccountsHexa not found in registry');
      }
      const accountsAdapter = accountsHexa.getAdapter();

      // Get SpacesPort (optional dependency)
      let spacesPort: ISpacesPort | null = null;
      try {
        spacesPort = registry.getAdapter<ISpacesPort>(ISpacesPortName);
        this.logger.info('SpacesAdapter retrieved from registry');
      } catch {
        this.logger.warn(
          'SpacesHexa not found in registry - space validation will not be available',
        );
      }

      this.logger.debug('Creating StandardsUseCases');
      this.useCases = new StandardsUseCases(
        this.standardsServices,
        this.standardsRepositories,
        this.deploymentsQueryAdapter,
        standardsDelayedJobs,
        accountsAdapter,
        spacesPort,
        this.standardsServices.getLinterAdapter(),
        this.logger,
      );

      // Mark as initialized before creating adapter (adapter needs access to useCases)
      this.isInitialized = true;

      // Create adapter
      this.standardsAdapter = new StandardsAdapter(this);

      this.logger.info('StandardsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize StandardsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async buildStandardsDelayedJobs(
    jobsHexa: JobsHexa,
    standardRepositories: IStandardsRepositories,
  ): Promise<IStandardDelayedJobs> {
    // Register our job queue with JobsHexa
    const jobStandardSummaryFactory = new GenerateStandardSummaryJobFactory(
      this.logger,
      standardRepositories,
    );

    jobsHexa.registerJobQueue(
      jobStandardSummaryFactory.getQueueName(),
      jobStandardSummaryFactory,
    );

    await jobStandardSummaryFactory.createQueue();

    if (!jobStandardSummaryFactory.delayedJob) {
      throw new Error('DelayedJob not found for StandardsHexa');
    }

    this.logger.debug('Standards delayed jobs built successfully');
    return {
      standardSummaryDelayedJob: jobStandardSummaryFactory.delayedJob,
    };
  }

  public getAdapter(): StandardsAdapter {
    if (!this.standardsAdapter) {
      if (!this.isInitialized || !this.useCases) {
        throw new Error(
          'StandardsHexa not initialized. Call initialize() before using.',
        );
      }
      this.standardsAdapter = new StandardsAdapter(this);
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
   * Set the deployments query adapter for accessing deployment data
   */
  public setDeploymentsQueryAdapter(adapter: IDeploymentPort): void {
    this.deploymentsQueryAdapter = adapter;
    this.useCases?.setDeploymentsQueryAdapter(adapter);
  }

  public setLinterAdapter(adapter: ILinterPort): void {
    this.logger.info('Setting linter adapter');
    this.standardsServices.setLinterAdapter(adapter);
    if (this.isInitialized) {
      this.logger.warn('Reinitializing use cases after linter adapter set');
      this.useCases.setLinterAdapter(adapter);
    }
  }

  public getStandardsServices(): StandardsServices {
    return this.standardsServices;
  }

  public getStandardsRepositories(): StandardsRepositories {
    return this.standardsRepositories;
  }

  public getStandardsUseCases(): StandardsUseCases {
    if (!this.isInitialized || !this.useCases) {
      throw new Error(
        'StandardsHexa not initialized. Call initialize() before using.',
      );
    }
    return this.useCases;
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
