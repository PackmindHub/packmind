import { JobsHexa } from '@packmind/jobs';
import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  IDeploymentPort,
  IDeploymentPortName,
  ILinterPort,
  ILinterPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { StandardsServices } from './application/services/StandardsServices';
import { StandardsAdapter } from './application/useCases/StandardsAdapter';
import { IStandardDelayedJobs } from './domain/jobs/IStandardDelayedJobs';
import { IStandardsRepositories } from './domain/repositories/IStandardsRepositories';
import { GenerateStandardSummaryJobFactory } from './infra/jobs/GenerateStandardSummaryJobFactory';
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
  private standardsAdapter?: StandardsAdapter;
  private deploymentsQueryAdapter?: IDeploymentPort;
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
      let linterPort: ILinterPort | undefined;
      try {
        linterPort = registry.getAdapter<ILinterPort>(ILinterPortName);
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

      // Get JobsHexa (required) for delayed job registration
      const jobsHexa = registry.get(JobsHexa);
      if (!jobsHexa) {
        throw new Error('JobsHexa not found in registry');
      }

      this.logger.debug('Building standards delayed jobs');
      const standardsDelayedJobs = await this.buildStandardsDelayedJobs(
        jobsHexa,
        this.standardsRepositories,
      );

      // Get Accounts port (required)
      const accountsPort =
        registry.getAdapter<IAccountsPort>(IAccountsPortName);

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

      this.logger.debug('Creating StandardsAdapter');
      this.standardsAdapter = new StandardsAdapter(
        this.standardsServices,
        this.standardsRepositories,
        standardsDelayedJobs,
        accountsPort,
        spacesPort,
        linterPort,
        this.deploymentsQueryAdapter,
        this.logger,
      );

      this.isInitialized = true;
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
      throw new Error(
        'StandardsHexa not initialized. Call initialize() before using.',
      );
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
   * Destroys the StandardsHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying StandardsHexa');
    // Add any cleanup logic here if needed
    this.logger.info('StandardsHexa destroyed');
  }
}
