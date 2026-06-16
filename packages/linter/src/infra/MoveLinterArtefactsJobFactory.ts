import { IJobFactory, IJobQueue, queueFactory } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import type {
  MoveLinterArtefactsToNewRulesCommand,
  ILinterPort,
} from '@packmind/types';
import { MoveLinterArtefactsDelayedJob } from '../application/useCases/moveLinterArtefactsToNewRules/shared/MoveLinterArtefactsDelayedJob';
import { ILinterRepositories } from '../domain/repositories/ILinterRepositories';

const origin = 'MoveLinterArtefactsJobFactory';

export class MoveLinterArtefactsJobFactory implements IJobFactory<MoveLinterArtefactsToNewRulesCommand> {
  public delayedJob: MoveLinterArtefactsDelayedJob | null = null;

  constructor(
    private readonly linterRepositories: ILinterRepositories,
    private readonly getLinterAdapter: () => ILinterPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async createQueue(): Promise<
    IJobQueue<MoveLinterArtefactsToNewRulesCommand>
  > {
    this.logger.info('Creating MoveLinterArtefacts job queue');

    this.delayedJob = new MoveLinterArtefactsDelayedJob(
      (listeners) => queueFactory(this.getQueueName(), listeners),
      this.linterRepositories,
      this.getLinterAdapter,
    );

    // Wrap the delayed job to implement IJobQueue interface
    return {
      addJob: async (
        input: MoveLinterArtefactsToNewRulesCommand,
      ): Promise<string> => {
        if (!this.delayedJob) {
          throw new Error('Queue not initialized. Call initialize() first.');
        }
        const jobId = await this.delayedJob.addJob(input);
        return jobId;
      },
      initialize: async (): Promise<void> => {
        if (!this.delayedJob) {
          throw new Error('DelayedJob not created. Call createQueue() first.');
        }
        await this.delayedJob.initialize();
        this.logger.info('MoveLinterArtefacts queue initialized');
      },
      destroy: async (): Promise<void> => {
        this.logger.info('MoveLinterArtefacts queue destroyed');
      },
    };
  }

  getQueueName(): string {
    return 'move-linter-artefacts';
  }
}
