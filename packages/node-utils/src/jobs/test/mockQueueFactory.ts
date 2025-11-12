import { IQueue, QueueListeners } from '../domain/IQueue';
import { MockJobQueue } from './MockJobQueue';

/**
 * Mock factory function for creating job queues in tests.
 * This replaces the real queueFactory that connects to Redis.
 */
export async function mockQueueFactory<Input, Output>(
  queueId: string,
  queueListeners?: Partial<QueueListeners>,
): Promise<IQueue<Input, Output>> {
  // Log the listeners parameter to avoid unused variable warnings
  if (queueListeners) {
    // In a real implementation, listeners would be used for event handling
  }

  // Use queueId to avoid unused variable warning
  if (!queueId) {
    throw new Error('Queue ID is required');
  }

  return new MockJobQueue<Input, Output>();
}
