import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import { DataSource } from 'typeorm';
import { JobsHexaFactory } from './JobsHexaFactory';
import { JobRegistry } from './application/JobRegistry';
import { IJobFactory } from './domain/IJobQueue';
import { IJobRegistry } from './domain/IJobRegistry';

const origin = 'JobsHexa';

/**
 * JobsHexa - Facade for the Jobs domain following the Hexa pattern.
 *
 * This class serves as the main entry point for jobs-related functionality.
 * It provides a generic job registry system that allows other packages to register
 * their job implementations without creating circular dependencies.
 *
 * The Hexa pattern separates concerns:
 * - JobsHexaFactory: Handles dependency injection and service instantiation
 * - JobsHexa: Serves as use case facade and integration point with other domains
 * - JobRegistry: Manages registration and initialization of job queues
 */
export class JobsHexa extends BaseHexa {
  private readonly hexa: JobsHexaFactory;
  private readonly jobRegistry: IJobRegistry;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing JobsHexa');

    try {
      // Initialize the hexagon factory
      this.hexa = new JobsHexaFactory(this.logger);

      // Initialize the job registry
      this.jobRegistry = new JobRegistry(this.logger);

      this.logger.info('JobsHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct JobsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize the hexa with access to the registry for adapter retrieval.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async initialize(_registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing JobsHexa (adapter retrieval phase)');
    // JobsHexa doesn't need any adapters from registry
    this.logger.info('JobsHexa initialized successfully');
  }

  /**
   * Destroys the JobsHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying JobsHexa');
    // Add any cleanup logic here if needed
    this.logger.info('JobsHexa destroyed');
  }

  /**
   * Get the port name for this hexa.
   * JobsHexa does not expose a port adapter.
   */
  public getPortName(): string {
    throw new Error('JobsHexa does not expose a port adapter');
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

  /**
   * JobsHexa does not expose an adapter (no cross-domain port).
   */
  public getAdapter(): void {
    return undefined;
  }
}
