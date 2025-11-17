import { IJobFactory, IJobQueue, queueFactory } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import { GenerateRecipeEmbeddingInput } from '../../domain/jobs/GenerateRecipeEmbedding';
import { GenerateRecipeEmbeddingDelayedJob } from '../../application/jobs/GenerateRecipeEmbeddingDelayedJob';
import { EmbeddingOrchestrationService } from '../../application/services/EmbeddingOrchestrationService';

const origin = 'GenerateRecipeEmbeddingJobFactory';

export class GenerateRecipeEmbeddingJobFactory
  implements IJobFactory<GenerateRecipeEmbeddingInput>
{
  private _delayedJob: GenerateRecipeEmbeddingDelayedJob | null = null;

  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
    private readonly embeddingOrchestrationService: EmbeddingOrchestrationService,
  ) {}

  async createQueue(): Promise<IJobQueue<GenerateRecipeEmbeddingInput>> {
    this.logger.info('Creating GenerateRecipeEmbedding job queue');

    this._delayedJob = new GenerateRecipeEmbeddingDelayedJob(
      (listeners) => queueFactory(this.getQueueName(), listeners),
      this.embeddingOrchestrationService,
      this.logger,
    );

    return {
      addJob: async (input: GenerateRecipeEmbeddingInput): Promise<string> => {
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
        this.logger.info('GenerateRecipeEmbedding queue initialized');
      },
      destroy: async (): Promise<void> => {
        this.logger.info('GenerateRecipeEmbedding queue destroyed');
      },
    };
  }

  get delayedJob(): GenerateRecipeEmbeddingDelayedJob | null {
    return this._delayedJob;
  }

  getQueueName(): string {
    return 'generate-recipe-embedding';
  }
}
