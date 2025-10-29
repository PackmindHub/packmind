import { Job, Worker } from 'bullmq';
import { Configuration } from '@packmind/shared';
import { Runner, WorkerListeners } from '../../domain/IQueue';
import { AbstractQueue } from './AbstractQueue';

export class WorkerQueue<Input, Output> extends AbstractQueue<Input, Output> {
  async addWorker(
    runner: Runner<Input, Output>,
    listeners?: Partial<WorkerListeners<Input, Output>>,
  ): Promise<Worker<Input, Output> | null> {
    this._logger.info(`Start worker for ${this.QUEUE_ID}`);
    const worker = new Worker(
      this.QUEUE_ID,
      async (job: Job) => {
        this._logger.info(`[${this.QUEUE_ID}] Processing job ${job.id}`);

        const controller = new AbortController();

        let timeout: NodeJS.Timeout | undefined;
        try {
          // Get timeout from configuration or use default
          const defaultTimeout = 60000 * 10; // 10 minutes
          const configuredTimeout =
            await Configuration.getConfig('AI_REQUEST_TIMEOUT');
          const timeoutValue =
            job.data.timeout ??
            (configuredTimeout ? parseInt(configuredTimeout) : defaultTimeout);

          timeout = setTimeout(() => controller.abort(), timeoutValue);
          return await runner(job, controller);
        } catch (err) {
          const error = err as Error;
          if (error.message === 'Timeout') {
            this._logger.error(`[${this.QUEUE_ID}] Timeout for job ${job.id}`);
          } else {
            this._logger.error(
              `[${this.QUEUE_ID}] Error processing job ${job.id}: ${error.message}`,
            );
          }
          if (job.id) {
            await this.cancelJob(job.id);
          }
          throw err; // Re-throw to mark job as failed
        } finally {
          if (timeout) {
            clearTimeout(timeout);
          }
        }
      },
      {
        connection: this.connection,
        concurrency: await this.getConcurrency(),
      },
    );

    this.registerWorkerEvents(worker, {
      completed: async (job, result) => {
        this._logger.info(
          `[${this.QUEUE_ID}] Job ${job.id} completed with result: ${result}`,
        );

        if (listeners?.completed) {
          await listeners.completed(job, result);
        }
      },
      failed: async (job, err) => {
        if (job) {
          this._logger.error(
            `[${this.QUEUE_ID}] Job ${job.id} failed with error: ${err.message}`,
          );
          this._logger.info(`[${this.QUEUE_ID}] Removing job ${job.id}`);
          await job.remove();
        } else {
          this._logger.error(
            `[${this.QUEUE_ID}] Job failed with error: ${err.message}`,
          );
        }

        if (listeners?.failed) {
          await listeners.failed(job, err);
        }
      },
      error: async (err) => {
        this._logger.error(`Worker error: ${err.message}`);

        if (listeners?.error) {
          await listeners.error(err);
        }
      },
    });
    return worker;
  }

  private async getConcurrency(): Promise<number> {
    const defaultConcurrency = 1;
    const configuredConcurrency = await Configuration.getConfig(
      'MAX_CONCURRENCY_FOR_WORKER',
    );

    if (!configuredConcurrency) {
      return defaultConcurrency;
    }

    const parsed = parseInt(configuredConcurrency);
    return isNaN(parsed) || parsed <= 0 ? defaultConcurrency : parsed;
  }

  private registerWorkerEvents(
    worker: Worker<Input, Output>,
    events: Partial<WorkerListeners<Input, Output>>,
  ) {
    if (events.completed) {
      worker.on('completed', events.completed);
    }

    if (events.failed) {
      worker.on('failed', (job, error) => {
        // BullMQ's failed event can have job as undefined, but our interface expects Job
        // We handle both cases in the wrapper
        if (events.failed) {
          events.failed(job as Job<Input, Output>, error);
        }
      });
    }

    if (events.error) {
      worker.on('error', events.error);
    }
  }
}
