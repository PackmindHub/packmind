import {
  BaseHexa,
  BaseHexaOpts,
  HexaRegistry,
  PackmindLogger,
} from '@packmind/shared';
import { JobsHexaFactory } from './JobsHexaFactory';
import { IJobRegistry } from './domain/IJobRegistry';
import { IJobFactory } from './domain/IJobQueue';
import { JobRegistry } from './application/JobRegistry';

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
    registry: HexaRegistry,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(registry, opts);
    this.logger.info('Initializing JobsHexa');

    try {
      const dataSource = registry.getDataSource();
      this.logger.debug('Retrieved DataSource from registry');

      // Initialize the hexagon factory
      this.hexa = new JobsHexaFactory(this.logger, dataSource, registry);

      // Initialize the job registry
      this.jobRegistry = new JobRegistry(this.logger);

      this.logger.info('JobsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize JobsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
