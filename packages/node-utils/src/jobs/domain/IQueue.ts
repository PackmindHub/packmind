import { Job, JobsOptions, Worker } from 'bullmq';

export interface IQueue<Input, Output> {
  addJob(
    name: string,
    params: WithTimeout<Input>,
    jobsOptions?: JobsOptions,
  ): Promise<string>;
  cancelJob(jobId: string): Promise<void>;
  addWorker(
    runner: Runner<Input, Output>,
    listeners?: Partial<WorkerListeners<Input, Output>>,
  ): Promise<Worker<Input, Output> | null>;
}

export type WithTimeout<T> = T & { timeout?: number };

export type Runner<Input, Output> = (
  job: Job<WithTimeout<Input>, Output>,
  controller: AbortController,
) => Promise<Output>;

export type WorkerListeners<Input, Output> = {
  completed: (job: Job<Input, Output>, result: Output) => Promise<void>;
  failed: (job: Job<Input, Output>, error: Error) => Promise<void>;
  error: (error: Error) => Promise<void>;
};

export type QueueListeners = {
  completed: (jobId: string) => Promise<void>;
  failed: (jobId: string) => Promise<void>;
};
