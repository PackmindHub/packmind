import { IJobFactory, IJobQueue, queueFactory } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import { DistillAllPendingTopicsInput } from '../../domain/jobs/DistillAllPendingTopics';
import { DistillAllPendingTopicsDelayedJob } from '../../application/jobs/DistillAllPendingTopicsDelayedJob';
import { TopicService } from '../../application/services/TopicService';
import { DistillTopicUsecase } from '../../application/useCases/distillTopic/distillTopic.usecase';

const origin = 'DistillAllPendingTopicsJobFactory';

export class DistillAllPendingTopicsJobFactory
  implements IJobFactory<DistillAllPendingTopicsInput>
{
  private _delayedJob: DistillAllPendingTopicsDelayedJob | null = null;

  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
    private readonly topicService: TopicService,
    private readonly distillTopicUsecase: DistillTopicUsecase,
  ) {}

  async createQueue(): Promise<IJobQueue<DistillAllPendingTopicsInput>> {
    this.logger.info('Creating DistillAllPendingTopics job queue');

    this._delayedJob = new DistillAllPendingTopicsDelayedJob(
      (listeners) => queueFactory(this.getQueueName(), listeners),
      this.topicService,
      this.distillTopicUsecase,
    );

    return {
      addJob: async (input: DistillAllPendingTopicsInput): Promise<string> => {
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
        this.logger.info('DistillAllPendingTopics queue initialized');
      },
      destroy: async (): Promise<void> => {
        this.logger.info('DistillAllPendingTopics queue destroyed');
      },
    };
  }

  get delayedJob(): DistillAllPendingTopicsDelayedJob | null {
    return this._delayedJob;
  }

  getQueueName(): string {
    return 'distill-all-pending-topics';
  }
}
