import { IQueue, QueueListeners } from '../domain/IQueue';
import { MockJobQueue } from './MockJobQueue';

/** Drop-in for `queueFactory` that needs no Redis. */
export async function mockQueueFactory<Input, Output>(
  queueId: string,
  queueListeners?: Partial<QueueListeners>,
): Promise<IQueue<Input, Output>> {
  // Listeners are accepted and ignored - no worker runs, so nothing can fire.
  // The empty branch only keeps the parameter from reading as unused.
  if (queueListeners) {
    // Intentionally empty.
  }

  if (!queueId) {
    throw new Error('Queue ID is required');
  }

  return new MockJobQueue<Input, Output>();
}
