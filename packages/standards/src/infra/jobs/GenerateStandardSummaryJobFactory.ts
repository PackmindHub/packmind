import { IJobFactory, IJobQueue, queueFactory } from '@packmind/jobs';
import { PackmindLogger } from '@packmind/shared';
import { GenerateStandardSummaryInput } from '../../domain/jobs/GenerateStandardSummary';
import { GenerateStandardSummaryDelayedJob } from '../../application/jobs/GenerateStandardSummaryDelayedJob';
import { IStandardsRepositories } from '../../domain/repositories/IStandardsRepositories';
import { UpdateStandardVersionSummaryUsecase } from '../../application/useCases/updateStandardVersionSummary/updateStandardVersionSummary.usecase';

const origin = 'GenerateStandardSummaryJobFactory';

export class GenerateStandardSummaryJobFactory
  implements IJobFactory<GenerateStandardSummaryInput>
{
  private _delayedJob: GenerateStandardSummaryDelayedJob | null = null;

  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
    private readonly standardsRepositories: IStandardsRepositories,
  ) {}

  async createQueue(): Promise<IJobQueue<GenerateStandardSummaryInput>> {
    this.logger.info('Creating GenerateStandardSummary job queue');

    this._delayedJob = new GenerateStandardSummaryDelayedJob(
      (listeners) => queueFactory(this.getQueueName(), listeners),
      new UpdateStandardVersionSummaryUsecase(this.standardsRepositories),
    );

    // Wrap the delayed job to implement IJobQueue interface
    return {
      addJob: async (input: GenerateStandardSummaryInput): Promise<string> => {
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
        // Initialize the queue using the public initialize method
        await this._delayedJob.initialize();
        this.logger.info('GenerateStandardSummary queue initialized');
      },
      destroy: async (): Promise<void> => {
        // AbstractAIDelayedJob doesn't expose destroy method
        this.logger.info('GenerateStandardSummary queue destroyed');
      },
    };
  }

  get delayedJob(): GenerateStandardSummaryDelayedJob | null {
    return this._delayedJob;
  }

  getQueueName(): string {
    return 'generate-standard-summary';
  }
}
