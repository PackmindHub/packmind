import {
  ConnectionOptions,
  JobsOptions,
  QueueEvents,
  Worker,
  Queue as BMQueue,
} from 'bullmq';
import {
  IQueue,
  QueueListeners,
  Runner,
  WorkerListeners,
} from '../../domain/IQueue';
import { PackmindLogger } from '@packmind/logger';
import { PackmindSerializer } from '../../utils/PackmindSerializer';

export abstract class AbstractQueue<Input, Output> implements IQueue<
  Input,
  Output
> {
  protected queue: BMQueue;

  constructor(
    protected readonly QUEUE_ID: string,
    protected readonly connection: ConnectionOptions,
    queueListeners?: Partial<QueueListeners>,
    protected readonly _logger = new PackmindLogger('AbstractQueue'),
  ) {
    this.queue = new BMQueue(this.QUEUE_ID, { connection: this.connection });
    this.registerQueueEvents(queueListeners ?? {});
    this._logger.info(`Queue ${this.QUEUE_ID} initialized`);
  }

  abstract addWorker(
    runner: Runner<Input, Output>,
    listeners?: Partial<WorkerListeners<Input, Output>>,
  ): Promise<Worker<Input, Output> | null>;

  async addJob(
    name: string,
    params: Input,
    jobsOptions?: JobsOptions,
  ): Promise<string> {
    if (!this.queue) {
      throw new Error(`Queue ${this.QUEUE_ID} not initialized`);
    }

    const job = await this.queue.add(
      name,
      PackmindSerializer.withPackmindSafeObjects(params),
      {
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 0, // Retry up to 3 times
        ...jobsOptions,
      },
    );

    if (!job.id) {
      throw new Error(
        `Failed to get job ID after adding job to queue ${this.QUEUE_ID}`,
      );
    }

    return job.id;
  }

  async cancelJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      try {
        // Check if the job is still active or waiting
        if ((await job.isActive()) || (await job.isWaiting())) {
          this._logger.info(
            `[${this.QUEUE_ID}] Attempt to cancel Job with ID ${jobId}`,
          );
          await this.queue.remove(jobId, { removeChildren: true });
          await job.remove();
          this._logger.info(
            `[${this.QUEUE_ID}] Job with ID ${jobId} was cancelled`,
          );
        } else {
          this._logger.info(
            `[${this.QUEUE_ID}] Job with ID ${jobId} is no longer active or waiting`,
          );
        }
      } catch (error) {
        this._logger.warn(
          `Failed to cancel job ${jobId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else {
      this._logger.info(`[${this.QUEUE_ID}] Job with ID ${jobId} not found`);
    }
  }

  private registerQueueEvents(queueListeners: Partial<QueueListeners>) {
    const queueEvents = new QueueEvents(this.QUEUE_ID, {
      connection: this.connection,
    });

    queueEvents.on('waiting', ({ jobId }) => {
      this._logger.info(`[${this.QUEUE_ID}] A job with ID ${jobId} is waiting`);
    });

    queueEvents.on('active', ({ jobId, prev }) => {
      this._logger.info(
        `[${this.QUEUE_ID}] Job ${jobId} is now active; previous status was ${prev}`,
      );
    });

    queueEvents.on('completed', async ({ jobId }) => {
      this._logger.info(`[${this.QUEUE_ID}] Job ${jobId} has completed`);

      if (queueListeners.completed) {
        await queueListeners.completed(jobId);
      }
    });

    queueEvents.on('failed', async ({ jobId, failedReason }) => {
      this._logger.error(
        `[${this.QUEUE_ID}] Job ${jobId} has failed with reason ${failedReason}`,
      );

      if (queueListeners.failed) {
        await queueListeners.failed(jobId);
      }
    });
  }
}
