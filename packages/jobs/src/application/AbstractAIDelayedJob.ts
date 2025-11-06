import { PackmindLogger } from '@packmind/logger';
import { Configuration } from '@packmind/shared';
import { IDelayedJob } from '../domain/IDelayedJob';
import { IQueue, QueueListeners, WorkerListeners } from '../domain/IQueue';
import { PackmindSerializer } from '../utils/PackmindSerializer';
import { TokensUsed, TokensUsedByOperation } from '../domain/TokensUsed';

export abstract class AbstractAIDelayedJob<Input, Output>
  implements IDelayedJob<Input, Output>
{
  protected queue!: IQueue<Input, Output>;
  abstract readonly origin: string;
  protected timeout!: number;
  protected readonly DEFAULT_JOB_TIMEOUT = 60000 * 10; // 10  minutes
  private initialized = false;

  constructor(
    private queueFactory: (
      queueListeners: Partial<QueueListeners>,
    ) => Promise<IQueue<Input, Output>>,
    protected readonly logger: PackmindLogger,
  ) {
    // Initialization is now deferred to async init method
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      this.queue = await this.queueFactory({
        failed: (jobId) => this.onFail(jobId),
      });

      await this.queue.addWorker(
        (job, controller) =>
          this.runJob(
            job.id || 'unknown',
            PackmindSerializer.fromPackmindSafeObjects(job.data),
            controller,
          ),
        this.getWorkerListener(),
      );

      this.initialized = true;
    }
  }

  async addJob(input: Input): Promise<string> {
    await this.ensureInitialized();

    const configuredTimeout = await Configuration.getConfig(
      'MAX_JOBS_DETECTION_TIMEOUT',
    );
    this.timeout = this.parseTimeout(configuredTimeout);

    const jobId = await this.queue.addJob(this.getJobName(input), {
      ...input,
      timeout: this.timeout,
    });

    this.logger.info(
      `[${this.origin}] Job ${jobId} added to the queue with ${this.jobStartedInfo(input)}`,
    );
    return jobId;
  }

  async cancelJob(jobId: string): Promise<void> {
    await this.ensureInitialized();
    return this.queue.cancelJob(jobId);
  }

  async initialize(): Promise<void> {
    await this.ensureInitialized();
  }

  protected assessTokens(operations: TokensUsedByOperation[]): TokensUsed {
    return {
      input: operations.reduce((acc, operation) => acc + operation.input, 0),
      output: operations.reduce((acc, operation) => acc + operation.output, 0),
      details: operations,
    };
  }

  private parseTimeout(configuredTimeout: string | null): number {
    // Handle null, undefined, or empty string
    if (!configuredTimeout || typeof configuredTimeout !== 'string') {
      return this.DEFAULT_JOB_TIMEOUT;
    }

    // Parse the timeout value
    const parsedTimeout = Number(configuredTimeout.trim());

    // Check if it's a valid positive number and within reasonable bounds
    if (
      isNaN(parsedTimeout) ||
      !isFinite(parsedTimeout) ||
      parsedTimeout <= 0
    ) {
      return this.DEFAULT_JOB_TIMEOUT;
    }

    return parsedTimeout;
  }

  abstract onFail(jobId: string): Promise<void>;
  abstract runJob(
    jobId: string,
    input: Input,
    controller: AbortController,
  ): Promise<Output>;
  abstract getJobName(input: Input): string;
  abstract jobStartedInfo(input: Input): string;
  abstract getWorkerListener(): Partial<WorkerListeners<Input, Output>>;
}
