import { Worker } from 'bullmq';
import { IQueue, WithTimeout, Runner, WorkerListeners } from '../domain/IQueue';

/** In-memory IQueue, so a test needs no Redis and starts no BullMQ worker. */
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
    jobsOptions?: unknown,
  ): Promise<string> {
    // Options are accepted and dropped; the empty branch only keeps the
    // parameter from reading as unused.
    if (jobsOptions) {
      // Intentionally empty.
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

  async removeRepeatable(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _name: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _pattern: string,
    jobId: string,
  ): Promise<void> {
    // Name and pattern are ignored: dropping the job with this id is enough
    // for a test to observe a cleared schedule.
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
    // No worker is started, so a queued job is never processed - a test that
    // needs the runner to have run must invoke it itself.
    return null;
  }

  // Beyond IQueue - inspection helpers for assertions.
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
