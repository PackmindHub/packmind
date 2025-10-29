// This interface is meant to be deleted in next version
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface IDelayedJob<Input, Output> {
  addJob(input: Input): Promise<string>;
  cancelJob(jobId: string): Promise<void>;
}
