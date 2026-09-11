import { PackmindLogger } from '@packmind/logger';
import {
  IJobFactory,
  IJobQueue,
  instrumentUseCase,
  queueFactory,
} from '@packmind/node-utils';
import { GitRepoService } from '../../application/GitRepoService';
import { ResolvedGitRepoService } from '../../application/services/ResolvedGitRepoService';
import { FetchFileContentDelayedJob } from '../../application/jobs/FetchFileContentDelayedJob';
import { GetFileFromRepoUseCase } from '../../application/useCases/getFileFromRepo/GetFileFromRepoUseCase';
import { FetchFileContentInput } from '../../domain/jobs/FetchFileContent';

const origin = 'FetchFileContentJobFactory';

export class FetchFileContentJobFactory implements IJobFactory<FetchFileContentInput> {
  private _delayedJob: FetchFileContentDelayedJob | null = null;

  constructor(
    private readonly gitRepoService: GitRepoService,
    private readonly resolvedGitRepoService: ResolvedGitRepoService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async createQueue(): Promise<IJobQueue<FetchFileContentInput>> {
    this.logger.info('Creating FetchFileContent job queue');

    // The one use case built outside an adapter, so it opts itself in rather
    // than being picked up by instrumentUseCases(this) - see docker/otel/README.md.
    const getFileFromRepo = instrumentUseCase(
      new GetFileFromRepoUseCase(this.resolvedGitRepoService),
    );

    this._delayedJob = new FetchFileContentDelayedJob(
      (listeners) => queueFactory(this.getQueueName(), listeners),
      this.gitRepoService,
      getFileFromRepo,
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
