import { IJobFactory, IJobQueue, queueFactory } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import { GenerateStandardEmbeddingInput } from '../../domain/jobs/GenerateStandardEmbedding';
import { GenerateStandardEmbeddingDelayedJob } from '../../application/jobs/GenerateStandardEmbeddingDelayedJob';
import { EmbeddingOrchestrationService } from '../../application/services/EmbeddingOrchestrationService';

const origin = 'GenerateStandardEmbeddingJobFactory';

export class GenerateStandardEmbeddingJobFactory
  implements IJobFactory<GenerateStandardEmbeddingInput>
{
  private _delayedJob: GenerateStandardEmbeddingDelayedJob | null = null;

  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
    private readonly embeddingOrchestrationService: EmbeddingOrchestrationService,
  ) {}

  async createQueue(): Promise<IJobQueue<GenerateStandardEmbeddingInput>> {
    this.logger.info('Creating GenerateStandardEmbedding job queue');

    this._delayedJob = new GenerateStandardEmbeddingDelayedJob(
      (listeners) => queueFactory(this.getQueueName(), listeners),
      this.embeddingOrchestrationService,
      this.logger,
    );

    return {
      addJob: async (
        input: GenerateStandardEmbeddingInput,
      ): Promise<string> => {
        if (!this._delayedJob) {
          throw new Error('Queue not initialized. Call initialize() first.');
        }
        const jobId = await this._delayedJob.addJob(input);
        return jobId;
      },
      initialize: async (): Promise<void> => {
        if (!this._delayedJob) {
          throw new Error('DelayedJob not created. Call createQueue() first.');
        }
        await this._delayedJob.initialize();
        this.logger.info('GenerateStandardEmbedding queue initialized');
      },
      destroy: async (): Promise<void> => {
        this.logger.info('GenerateStandardEmbedding queue destroyed');
      },
    };
  }

  get delayedJob(): GenerateStandardEmbeddingDelayedJob | null {
    return this._delayedJob;
  }

  getQueueName(): string {
    return 'generate-standard-embedding';
  }
}
