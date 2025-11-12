import { PackmindLogger } from '@packmind/logger';
import { DataSource } from 'typeorm';
import { BaseService, BaseServiceOpts } from '../hexa/BaseService';
import { HexaRegistry } from '../hexa/HexaRegistry';
import { JobRegistry } from './application/JobRegistry';
import { IJobFactory } from './domain/IJobQueue';
import { IJobRegistry } from './domain/IJobRegistry';

const origin = 'JobsService';

/**
 * JobsService - Infrastructure service for background job management.
 *
 * This service provides a generic job registry system that allows other packages
 * to register their job implementations without creating circular dependencies.
 * Unlike domain hexas, this service is pure infrastructure and doesn't implement
 * the port-adapter pattern.
 */
export class JobsService extends BaseService {
  private readonly jobRegistry: IJobRegistry;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseServiceOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing JobsService');

    try {
      // Initialize the job registry
      this.jobRegistry = new JobRegistry(this.logger);

      this.logger.info('JobsService construction completed');
    } catch (error) {
      this.logger.error('Failed to construct JobsService', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize the service with access to the registry.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async initialize(_registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing JobsService');
    // JobsService doesn't need any adapters from registry
    this.logger.info('JobsService initialized successfully');
  }

  /**
   * Destroys the JobsService and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying JobsService');
    // Add any cleanup logic here if needed
    this.logger.info('JobsService destroyed');
  }

  /**
   * Register a job queue factory
   */
  public registerJobQueue<TInput>(
    queueName: string,
    factory: IJobFactory<TInput>,
  ): void {
    this.logger.info('Registering job queue', { queueName });
    this.jobRegistry.registerQueue(queueName, factory);
  }

  /**
   * Initialize all registered job queues
   */
  public async initJobQueues(): Promise<void> {
    this.logger.info('Initializing all registered job queues');
    await this.jobRegistry.initializeAllQueues();
    this.logger.info('Successfully initialized all job queues');
  }

  /**
   * Submit a job to a specific queue
   */
  public async submitJob<TInput>(
    queueName: string,
    input: TInput,
  ): Promise<string> {
    this.logger.info('Submitting job to queue', {
      queueName,
      availableQueues: this.getAvailableQueues(),
    });

    const queue = this.jobRegistry.getQueue<TInput>(queueName);
    if (!queue) {
      this.logger.error('Queue not found', {
        requestedQueue: queueName,
        availableQueues: this.getAvailableQueues(),
      });
      throw new Error(
        `Queue '${queueName}' not found. Make sure it's registered and initialized.`,
      );
    }

    const jobId = await queue.addJob(input);

    this.logger.info('Successfully submitted job', { queueName, jobId });
    return jobId;
  }

  /**
   * Get available queue names (for debugging/monitoring)
   */
  public getAvailableQueues(): string[] {
    return this.jobRegistry.getRegisteredQueueNames();
  }
}
