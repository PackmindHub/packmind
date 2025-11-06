import { IJobFactory, IJobQueue, queueFactory } from '@packmind/jobs';
import { PackmindLogger } from '@packmind/logger';
import { FetchFileContentInput } from '../../domain/jobs/FetchFileContent';
import { FetchFileContentDelayedJob } from '../../application/jobs/FetchFileContentDelayedJob';
import { GitRepoService } from '../../application/GitRepoService';
import { GetFileFromRepo } from '../../application/useCases/getFileFromRepo/getFileFromRepo.usecase';
import { GitProviderService } from '../../application/GitProviderService';
import { IGitRepoFactory } from '../../domain/repositories/IGitRepoFactory';

const origin = 'FetchFileContentJobFactory';

export class FetchFileContentJobFactory
  implements IJobFactory<FetchFileContentInput>
{
  private _delayedJob: FetchFileContentDelayedJob | null = null;

  constructor(
    private readonly gitRepoService: GitRepoService,
    private readonly gitProviderService: GitProviderService,
    private readonly gitRepoFactory: IGitRepoFactory,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async createQueue(): Promise<IJobQueue<FetchFileContentInput>> {
    this.logger.info('Creating FetchFileContent job queue');

    const getFileFromRepo = new GetFileFromRepo(
      this.gitProviderService,
      this.gitRepoFactory,
      this.logger,
    );

    this._delayedJob = new FetchFileContentDelayedJob(
      (listeners) => queueFactory(this.getQueueName(), listeners),
      this.gitRepoService,
      getFileFromRepo,
      this.logger,
    );

    return {
      addJob: async (input: FetchFileContentInput): Promise<string> => {
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
        this.logger.info('FetchFileContent queue initialized');
      },
      destroy: async (): Promise<void> => {
        this.logger.info('FetchFileContent queue destroyed');
      },
    };
  }

  get delayedJob(): FetchFileContentDelayedJob | null {
    return this._delayedJob;
  }

  getQueueName(): string {
    return 'fetch-file-content';
  }
}
