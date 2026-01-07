import { IJobFactory, IJobQueue, queueFactory } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import { UpdateRecipesAndGenerateSummariesInput } from '../../domain/jobs/UpdateRecipesAndGenerateSummaries';
import { UpdateRecipesAndGenerateSummariesDelayedJob } from '../../application/jobs/UpdateRecipesAndGenerateSummariesDelayedJob';
import { RecipeService } from '../../application/services/RecipeService';
import { RecipeVersionService } from '../../application/services/RecipeVersionService';
import { RecipeSummaryService } from '../../application/services/RecipeSummaryService';

const origin = 'UpdateRecipesAndGenerateSummariesJobFactory';

export class UpdateRecipesAndGenerateSummariesJobFactory
  implements IJobFactory<UpdateRecipesAndGenerateSummariesInput>
{
  private _delayedJob: UpdateRecipesAndGenerateSummariesDelayedJob | null =
    null;

  constructor(
    private readonly recipeService: RecipeService,
    private readonly recipeVersionService: RecipeVersionService,
    private readonly recipeSummaryService: RecipeSummaryService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async createQueue(): Promise<
    IJobQueue<UpdateRecipesAndGenerateSummariesInput>
  > {
    this.logger.info('Creating UpdateRecipesAndGenerateSummaries job queue');

    this._delayedJob = new UpdateRecipesAndGenerateSummariesDelayedJob(
      (listeners) => queueFactory(this.getQueueName(), listeners),
      this.recipeService,
      this.recipeVersionService,
      this.recipeSummaryService,
      this.logger,
    );

    return {
      addJob: async (
        input: UpdateRecipesAndGenerateSummariesInput,
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
        this.logger.info('UpdateRecipesAndGenerateSummaries queue initialized');
      },
      destroy: async (): Promise<void> => {
        this.logger.info('UpdateRecipesAndGenerateSummaries queue destroyed');
      },
    };
  }

  getDelayedJob(): UpdateRecipesAndGenerateSummariesDelayedJob {
    if (!this._delayedJob) {
      throw new Error(
        '[UpdateRecipesAndGenerateSummariesDelayedJob] Delayed job not initialized. Call createQueue() first.',
      );
    }
    return this._delayedJob;
  }

  getQueueName(): string {
    return 'update-recipes-and-generate-summaries';
  }
}
