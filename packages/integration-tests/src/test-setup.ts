import {
  IQueue,
  WorkerListeners,
  WithTimeout,
  Runner,
} from '@packmind/node-utils';
import { Job, JobsOptions, Worker } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';

// Global setup for integration tests to mock Redis connections

class SyncJob<Input, Output> implements IQueue<Input, Output> {
  private runner: Runner<Input, Output>;

  async addJob(
    name: string,
    params: WithTimeout<Input>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _jobsOptions?: JobsOptions,
  ): Promise<string> {
    if (this.runner) {
      await this.runner(
        { data: params } as Job<WithTimeout<Input>, Output, string>,
        new AbortController(),
      );
    }
    return uuidv4();
  }

  async addWorker(
    runner: Runner<Input, Output>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _listeners?: Partial<WorkerListeners<Input, Output>>,
  ): Promise<Worker<Input, Output> | null> {
    this.runner = runner;
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  async cancelJob(_jobId: string): Promise<void> {}
}

// Mock the queueFactory, Configuration, and SSEEventPublisher from @packmind/node-utils
jest.mock('@packmind/node-utils', () => {
  const actual = jest.requireActual('@packmind/node-utils');

  return {
    ...actual,
    queueFactory: jest.fn().mockImplementation(async () => new SyncJob()),
    Configuration: {
      getConfig: jest.fn().mockImplementation((key: string) => {
        if (key === 'ENCRYPTION_KEY') {
          return Promise.resolve('random-encryption-key-for-testing');
        }
        return Promise.resolve(null);
      }),
    },
    SSEEventPublisher: {
      getInstance: jest.fn(),
      publishProgramStatusEvent: jest.fn().mockResolvedValue(undefined),
      publishAssessmentStatusEvent: jest.fn().mockResolvedValue(undefined),
      publishDetectionHeuristicsUpdatedEvent: jest
        .fn()
        .mockResolvedValue(undefined),
      publishUserContextChangeEvent: jest.fn().mockResolvedValue(undefined),
      publishDistributionStatusChangeEvent: jest
        .fn()
        .mockResolvedValue(undefined),
      publishEvent: jest.fn().mockResolvedValue(undefined),
    },
  };
});
