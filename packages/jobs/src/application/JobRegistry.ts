import { PackmindLogger } from '@packmind/shared';
import { IJobRegistry } from '../domain/IJobRegistry';
import { IJobFactory, IJobQueue } from '../domain/IJobQueue';

/**
 * Implementation of job registry for managing job queues
 */
export class JobRegistry implements IJobRegistry {
  private readonly factories = new Map<string, IJobFactory<unknown>>();
  private readonly queues = new Map<string, IJobQueue<unknown>>();

  constructor(private readonly logger: PackmindLogger) {}

  registerQueue<TInput>(queueName: string, factory: IJobFactory<TInput>): void {
    this.logger.info('Registering job queue', { queueName });

    if (this.factories.has(queueName)) {
      this.logger.warn('Job queue already registered, overwriting', {
        queueName,
      });
    }

    this.factories.set(queueName, factory as IJobFactory<unknown>);
  }

  getQueue<TInput>(queueName: string): IJobQueue<TInput> | undefined {
    const queue = this.queues.get(queueName);
    return queue as IJobQueue<TInput> | undefined;
  }

  async initializeAllQueues(): Promise<void> {
    this.logger.info('Initializing all registered job queues', {
      queueCount: this.factories.size,
      queueNames: Array.from(this.factories.keys()),
    });

    const initPromises: Promise<void>[] = [];

    for (const [queueName, factory] of this.factories.entries()) {
      const initPromise = this.initializeQueue(queueName, factory);
      initPromises.push(initPromise);
    }

    await Promise.all(initPromises);

    this.logger.info('All job queues initialized successfully', {
      initializedCount: this.queues.size,
    });
  }

  private async initializeQueue(
    queueName: string,
    factory: IJobFactory<unknown>,
  ): Promise<void> {
    try {
      this.logger.info('Initializing job queue', { queueName });

      const queue = await factory.createQueue();
      await queue.initialize();

      this.queues.set(queueName, queue);

      this.logger.info('Job queue initialized successfully', { queueName });
    } catch (error) {
      this.logger.error('Failed to initialize job queue', {
        queueName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  getRegisteredQueueNames(): string[] {
    return Array.from(this.factories.keys());
  }
}
