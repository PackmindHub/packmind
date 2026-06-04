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
    describe('when a queue was already initialized on a prior call', () => {
      let registry: JobRegistry;
      let first: ReturnType<typeof makeFactory>;
      let second: ReturnType<typeof makeFactory>;

      beforeEach(async () => {
        registry = new JobRegistry(stubLogger());
        first = makeFactory('queue-a');
        second = makeFactory('queue-b');

        registry.registerQueue('queue-a', first.factory);
        await registry.initializeAllQueues();

        registry.registerQueue('queue-b', second.factory);
        await registry.initializeAllQueues();
      });

      afterEach(() => {
        jest.clearAllMocks();
      });

      it('creates the previously initialized queue only once', () => {
        expect(first.createQueue).toHaveBeenCalledTimes(1);
      });

      it('initializes the previously initialized queue only once', () => {
        expect(first.initialize).toHaveBeenCalledTimes(1);
      });

      it('creates the newly registered queue exactly once', () => {
        expect(second.createQueue).toHaveBeenCalledTimes(1);
      });

      it('initializes the newly registered queue exactly once', () => {
        expect(second.initialize).toHaveBeenCalledTimes(1);
      });
    });
  });
});
