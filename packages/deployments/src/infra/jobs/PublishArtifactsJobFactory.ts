import { IJobFactory, IJobQueue, queueFactory } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import { IGitPort } from '@packmind/types';
import { PublishArtifactsDelayedJob } from '../../application/jobs/PublishArtifactsDelayedJob';
import { PublishArtifactsJobInput } from '../../domain/jobs/PublishArtifactsJob';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';

const origin = 'PublishArtifactsJobFactory';

export class PublishArtifactsJobFactory implements IJobFactory<PublishArtifactsJobInput> {
  private _delayedJob: PublishArtifactsDelayedJob | null = null;

  constructor(
    private readonly distributionRepository: IDistributionRepository,
    private readonly gitPort: IGitPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async createQueue(): Promise<IJobQueue<PublishArtifactsJobInput>> {
    this.logger.info('Creating PublishArtifacts job queue');

    this._delayedJob = new PublishArtifactsDelayedJob(
      (listeners) => queueFactory(this.getQueueName(), listeners),
      this.distributionRepository,
      this.gitPort,
      this.logger,
    );

    return {
      addJob: async (input: PublishArtifactsJobInput): Promise<string> => {
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
        this.logger.info('PublishArtifacts queue initialized');
      },
      destroy: async (): Promise<void> => {
        this.logger.info('PublishArtifacts queue destroyed');
      },
    };
  }

  get delayedJob(): PublishArtifactsDelayedJob | null {
    return this._delayedJob;
  }

  getQueueName(): string {
    return 'publish-artifacts';
  }
}
