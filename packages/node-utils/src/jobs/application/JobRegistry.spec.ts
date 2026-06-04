import { stubLogger } from '@packmind/test-utils';
import { IJobFactory, IJobQueue } from '../domain/IJobQueue';
import { JobRegistry } from './JobRegistry';

function makeFactory(name: string): {
  factory: IJobFactory<unknown>;
  createQueue: jest.Mock;
  initialize: jest.Mock;
  destroy: jest.Mock;
} {
  const initialize = jest.fn().mockResolvedValue(undefined);
  const destroy = jest.fn().mockResolvedValue(undefined);
  const addJob = jest.fn().mockResolvedValue('job-id');
  const queue: IJobQueue<unknown> = { addJob, initialize, destroy };
  const createQueue = jest.fn().mockResolvedValue(queue);
  const factory: IJobFactory<unknown> = {
    createQueue,
    getQueueName: () => name,
  };
  return { factory, createQueue, initialize, destroy };
}

describe('JobRegistry', () => {
  describe('initializeAllQueues', () => {
    it('skips factories whose queue was already initialized on a prior call', async () => {
      const registry = new JobRegistry(stubLogger());

      const first = makeFactory('queue-a');
      const second = makeFactory('queue-b');

      registry.registerQueue('queue-a', first.factory);
      await registry.initializeAllQueues();
      expect(first.createQueue).toHaveBeenCalledTimes(1);
      expect(first.initialize).toHaveBeenCalledTimes(1);

      registry.registerQueue('queue-b', second.factory);
      await registry.initializeAllQueues();

      // queue-a must NOT be re-created/re-initialized: otherwise its underlying
      // BullMQ worker would be duplicated on every subsequent Hexa boot.
      expect(first.createQueue).toHaveBeenCalledTimes(1);
      expect(first.initialize).toHaveBeenCalledTimes(1);

      // queue-b is new — must be initialized exactly once.
      expect(second.createQueue).toHaveBeenCalledTimes(1);
      expect(second.initialize).toHaveBeenCalledTimes(1);
    });
  });
});
