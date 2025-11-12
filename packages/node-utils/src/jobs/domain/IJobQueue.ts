/**
 * Generic job queue interface that any job implementation can use
 */
export interface IJobQueue<TInput = unknown> {
  addJob(input: TInput): Promise<string>; // Returns job ID
  initialize(): Promise<void>;
  destroy(): Promise<void>;
}

/**
 * Generic job factory interface
 */
export interface IJobFactory<TInput = unknown> {
  createQueue(): Promise<IJobQueue<TInput>>;
  getQueueName(): string;
}
