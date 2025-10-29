import { IQueue, QueueListeners } from './IQueue';

export type QueueFactory<Input, Output> = (
  queueId: string,
  queueListeners?: Partial<QueueListeners>,
) => IQueue<Input, Output>;
