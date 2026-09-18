import { PackmindLogger } from '@packmind/logger';
import { DataSource } from 'typeorm';
import { BaseService, BaseServiceOpts } from '../hexa/BaseService';
import { HexaRegistry } from '../hexa/HexaRegistry';
import { JobRegistry } from './application/JobRegistry';
import { IJobFactory } from './domain/IJobQueue';
import { IJobRegistry } from './domain/IJobRegistry';

const origin = 'JobsService';

/**
 * Holds the job registry so a domain can register its own queues without any
 * package having to depend on another's job implementations.
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
      this.jobRegistry = new JobRegistry();

      this.logger.info('JobsService construction completed');
    } catch (error) {
      this.logger.error('Failed to construct JobsService', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async initialize(_registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing JobsService');
    // Nothing to resolve - this service needs no adapter from the registry.
    this.logger.info('JobsService initialized successfully');
  }

  public destroy(): void {
    this.logger.info('Destroying JobsService');
    this.logger.info('JobsService destroyed');
  }

  public registerJobQueue<TInput>(
    queueName: string,
    factory: IJobFactory<TInput>,
  ): void {
    this.logger.info('Registering job queue', { queueName });
    this.jobRegistry.registerQueue(queueName, factory);
  }

  public async initJobQueues(): Promise<void> {
    this.logger.info('Initializing all registered job queues');
    await this.jobRegistry.initializeAllQueues();
    this.logger.info('Successfully initialized all job queues');
  }
}
