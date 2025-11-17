import { IJobFactory, IJobQueue, queueFactory } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import { DistillTopicsInput } from '../../domain/jobs/DistillTopics';
import { DistillTopicsDelayedJob } from '../../application/jobs/DistillTopicsDelayedJob';
import { DistillTopicUsecase } from '../../application/useCases/distillTopic/distillTopic.usecase';

const origin = 'DistillTopicsJobFactory';

export class DistillTopicsJobFactory
  implements IJobFactory<DistillTopicsInput>
{
  private _delayedJob: DistillTopicsDelayedJob | null = null;

  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
    private readonly distillTopicUsecase: DistillTopicUsecase,
  ) {}

  async createQueue(): Promise<IJobQueue<DistillTopicsInput>> {
    this.logger.info('Creating DistillTopics job queue');

    this._delayedJob = new DistillTopicsDelayedJob(
      (listeners) => queueFactory(this.getQueueName(), listeners),
      this.distillTopicUsecase,
    );

    return {
      addJob: async (input: DistillTopicsInput): Promise<string> => {
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
        this.logger.info('DistillTopics queue initialized');
      },
      destroy: async (): Promise<void> => {
        this.logger.info('DistillTopics queue destroyed');
      },
    };
  }

  get delayedJob(): DistillTopicsDelayedJob | null {
    return this._delayedJob;
  }

  getQueueName(): string {
    return 'distill-topics';
  }
}
