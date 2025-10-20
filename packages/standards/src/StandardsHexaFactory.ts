import { StandardsServices } from './application/services/StandardsServices';
import { StandardsRepositories } from './infra/repositories/StandardsRepositories';
import { DataSource } from 'typeorm';
import { StandardsUseCases } from './application/useCases';
import {
  HexaRegistry,
  PackmindLogger,
  IDeploymentPort,
} from '@packmind/shared';
import { GitHexa } from '@packmind/git';
import { IStandardDelayedJobs } from './domain/jobs/IStandardDelayedJobs';
import { GenerateStandardSummaryJobFactory } from './infra/jobs/GenerateStandardSummaryJobFactory';
import { JobsHexa } from '@packmind/jobs';
import { IStandardsRepositories } from './domain/repositories/IStandardsRepositories';

const origin = 'StandardsHexa';

export class StandardsHexaFactory {
  private readonly standardsRepositories: StandardsRepositories;
  private readonly standardsServices: StandardsServices;
  private readonly gitHexa: GitHexa;
  public useCases!: StandardsUseCases; // Non-null assertion since initialize() will set it
  private readonly registry: HexaRegistry;
  private deploymentsQueryAdapter?: IDeploymentPort;
  private isInitialized = false;

  constructor(
    dataSource: DataSource,
    gitHexa: GitHexa,
    registry: HexaRegistry,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
    deploymentsQueryAdapter?: IDeploymentPort,
  ) {
    this.logger.info('Constructing StandardsHexaFactory');

    try {
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      this.standardsRepositories = new StandardsRepositories(dataSource);
      this.standardsServices = new StandardsServices(
        this.standardsRepositories,
        this.logger,
      );

      this.logger.debug('Storing GitHexa reference');
      this.gitHexa = gitHexa;

      this.registry = registry;
      this.deploymentsQueryAdapter = deploymentsQueryAdapter;

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

      this.logger.debug('Creating StandardsUseCases');
      this.useCases = new StandardsUseCases(
        this.standardsServices,
        this.standardsRepositories,
        this.gitHexa,
        this.deploymentsQueryAdapter,
        standardsDelayedJobs,
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

  getStandardsServices(): StandardsServices {
    return this.standardsServices;
  }

  getStandardsRepositories(): StandardsRepositories {
    return this.standardsRepositories;
  }
}
