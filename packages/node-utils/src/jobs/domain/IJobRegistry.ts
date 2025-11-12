import { IJobFactory, IJobQueue } from './IJobQueue';

/**
 * Registry for job queues by name
 */
export interface IJobRegistry {
  registerQueue<TInput>(queueName: string, factory: IJobFactory<TInput>): void;

  getQueue<TInput>(queueName: string): IJobQueue<TInput> | undefined;

  initializeAllQueues(): Promise<void>;

  getRegisteredQueueNames(): string[];
}
