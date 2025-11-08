import { StandardsServices } from './application/services/StandardsServices';
import { StandardsRepositories } from './infra/repositories/StandardsRepositories';
import { DataSource } from 'typeorm';
import { StandardsUseCases } from './application/useCases';
import { PackmindLogger } from '@packmind/logger';
import { HexaRegistry } from '@packmind/node-utils';
import type {
  IDeploymentPort,
  ISpacesPort,
  ILinterPort,
} from '@packmind/types';
import { AccountsHexa } from '@packmind/accounts';
import { IStandardDelayedJobs } from './domain/jobs/IStandardDelayedJobs';
import { GenerateStandardSummaryJobFactory } from './infra/jobs/GenerateStandardSummaryJobFactory';
import { JobsHexa } from '@packmind/jobs';
import { IStandardsRepositories } from './domain/repositories/IStandardsRepositories';
import { SpacesHexa } from '@packmind/spaces';

const origin = 'StandardsHexa';

export class StandardsHexaFactory {
  private readonly standardsRepositories: StandardsRepositories;
  private readonly standardsServices: StandardsServices;
  public useCases!: StandardsUseCases; // Non-null assertion since initialize() will set it
  private readonly registry: HexaRegistry;
  private deploymentsQueryAdapter?: IDeploymentPort;
  private isInitialized = false;

  public getIsInitialized(): boolean {
    return this.isInitialized;
  }

  constructor(
    dataSource: DataSource,
    registry: HexaRegistry,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
    linterAdapter?: ILinterPort,
  ) {
    this.logger.info('Constructing StandardsHexaFactory');

    try {
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      this.standardsRepositories = new StandardsRepositories(dataSource);

      // Create services with linter adapter
      this.standardsServices = new StandardsServices(
        this.standardsRepositories,
        this.logger,
        linterAdapter,
      );

      this.registry = registry;

      this.logger.info('StandardsHexaFactory construction completed');
    } catch (error) {
      this.logger.error('Failed to construct StandardsHexaFactory', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Async initialization phase - must be called after construction
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('StandardsHexaFactory already initialized');
      return;
    }

    this.logger.info('Initializing StandardsHexaFactory (async phase)');

    try {
      const jobsHexa = this.registry.get(JobsHexa);
      if (!jobsHexa) {
        throw new Error('JobsHexa not found in registry');
      }

      this.logger.debug('Building standards delayed jobs');
      const standardsDelayedJobs = await this.buildStandardsDelayedJobs(
        jobsHexa,
        this.getStandardsRepositories(),
      );

      const accountsHexa = this.registry.get(AccountsHexa);
      if (!accountsHexa) {
        throw new Error('AccountsHexa not found in registry');
      }
      const userProvider = accountsHexa.getUserProvider();
      const organizationProvider = accountsHexa.getOrganizationProvider();

      // Get spaces port for space validation
      let spacesPort: ISpacesPort | null = null;
      if (this.registry.isRegistered(SpacesHexa)) {
        const spacesHexa = this.registry.get(SpacesHexa);
        spacesPort = spacesHexa.getAdapter();
      } else {
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
        userProvider,
        organizationProvider,
        spacesPort,
        undefined, // Linter adapter will be set later via setLinterAdapter()
        this.logger,
      );

      this.isInitialized = true;
      this.logger.info('StandardsHexaFactory initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize StandardsHexaFactory', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async buildStandardsDelayedJobs(
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

  /**
   * Set the deployments query adapter (for runtime wiring)
   */
  public setDeploymentsQueryAdapter(adapter: IDeploymentPort): void {
    this.deploymentsQueryAdapter = adapter;
    // Update use cases with new adapter
    this.useCases?.setDeploymentsQueryAdapter(adapter);
  }

  public setLinterAdapter(adapter: ILinterPort): void {
    this.logger.info('Setting linter adapter');
    // Update services with new adapter
    this.standardsServices.setLinterAdapter(adapter);
    // Reinitialize use cases if they exist
    if (this.isInitialized) {
      this.logger.warn('Reinitializing use cases after linter adapter set');
      // We need to recreate use cases with the new linter adapter
      // This is called after initialization, so we need to update the existing use cases
      this.useCases.setLinterAdapter(adapter);
    }
  }

  getStandardsServices(): StandardsServices {
    return this.standardsServices;
  }

  getStandardsRepositories(): StandardsRepositories {
    return this.standardsRepositories;
  }

  getStandardsUseCases(): StandardsUseCases {
    if (!this.isInitialized || !this.useCases) {
      throw new Error(
        'StandardsHexaFactory not initialized. Call initialize() before using.',
      );
    }
    return this.useCases;
  }
}
