// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface IDelayedJob<Input, Output> {
  addJob(input: Input): Promise<string>;
  cancelJob(jobId: string): Promise<void>;
}
