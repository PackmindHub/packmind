export interface IJobQueue<TInput = unknown> {
  /** Resolves to the job id. */
  addJob(input: TInput): Promise<string>;
  initialize(): Promise<void>;
  destroy(): Promise<void>;
}

export interface IJobFactory<TInput = unknown> {
  createQueue(): Promise<IJobQueue<TInput>>;
  getQueueName(): string;
}
