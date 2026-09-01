import { stubLogger } from '@packmind/test-utils';
import { Worker } from 'bullmq';
import { AbstractQueue } from './AbstractQueue';

const removeRepeatable = jest.fn().mockResolvedValue(true);

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    removeRepeatable,
  })),
  QueueEvents: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
  })),
}));

class TestQueue extends AbstractQueue<unknown, unknown> {
  async addWorker(): Promise<Worker | null> {
    return null;
  }
}

describe('AbstractQueue', () => {
  describe('removeRepeatable', () => {
    beforeEach(async () => {
      removeRepeatable.mockClear();
      const queue = new TestQueue('test-queue', {}, undefined, stubLogger());
      await queue.removeRepeatable('job-name', '*/30 * * * *', 'job-id');
    });

    // BullMQ rebuilds the repeat key with `{ ...repeatOpts, jobId }`, so a
    // jobId passed inside the repeat options is overwritten with `undefined`
    // and the removal silently no-ops.
    it('passes the job id as its own argument', () => {
      expect(removeRepeatable).toHaveBeenCalledWith(
        'job-name',
        { pattern: '*/30 * * * *' },
        'job-id',
      );
    });
  });
});
