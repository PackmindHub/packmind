import { Worker } from 'bullmq';
import { IQueue, WithTimeout, Runner, WorkerListeners } from '../domain/IQueue';

/**
 * Mock implementation of IQueue for testing purposes.
 * This avoids the need for Redis connections in tests.
 */
export class MockJobQueue<Input, Output> implements IQueue<Input, Output> {
  private readonly jobs: Array<{
    id: string;
    name: string;
    input: WithTimeout<Input>;
  }> = [];
  private jobCounter = 0;

  async addJob(
    name: string,
    params: WithTimeout<Input>,
    jobsOptions?: unknown, // JobsOptions from bullmq, but we don't need the full type here
  ): Promise<string> {
    // Avoid unused parameter warning
    if (jobsOptions) {
      // Mock implementation ignores job options
    }

    const jobId = `mock-job-${++this.jobCounter}`;
    this.jobs.push({ id: jobId, name, input: params });
    return jobId;
  }

  async cancelJob(jobId: string): Promise<void> {
    const jobIndex = this.jobs.findIndex((job) => job.id === jobId);
    if (jobIndex >= 0) {
      this.jobs.splice(jobIndex, 1);
    }
  }

  async addWorker(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    runner: Runner<Input, Output>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    listeners?: Partial<WorkerListeners<Input, Output>>,
  ): Promise<Worker<Input, Output> | null> {
    // Mock implementation - we don't actually create workers in tests
    // These parameters are required by the interface but not used in mock
    return null;
  }

  // Test utilities - these are not part of IQueue but useful for testing
  getJobs(): Array<{ id: string; name: string; input: WithTimeout<Input> }> {
    return [...this.jobs];
  }

  getJobCount(): number {
    return this.jobs.length;
  }

  getLastJob():
    | { id: string; name: string; input: WithTimeout<Input> }
    | undefined {
    return this.jobs[this.jobs.length - 1];
  }
}
