import { IJobFactory, IJobQueue, queueFactory } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import { IDeploymentPort } from '@packmind/types';
import { DeployCommandsDelayedJob } from '../../application/jobs/DeployCommandsDelayedJob';
import { DeployCommandsInput } from '../../domain/jobs/DeployCommands';

const origin = 'DeployRecipesJobFactory';

export class DeployCommandsJobFactory implements IJobFactory<DeployCommandsInput> {
  private _delayedJob: DeployCommandsDelayedJob | null = null;

  constructor(
    private readonly deploymentPort: IDeploymentPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async createQueue(): Promise<IJobQueue<DeployCommandsInput>> {
    this.logger.info('Creating DeployRecipes job queue');

    this._delayedJob = new DeployCommandsDelayedJob(
      (listeners) => queueFactory(this.getQueueName(), listeners),
      this.deploymentPort,
    );

    return {
      addJob: async (input: DeployCommandsInput): Promise<string> => {
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
        this.logger.info('DeployRecipes queue initialized');
      },
      destroy: async (): Promise<void> => {
        this.logger.info('DeployRecipes queue destroyed');
      },
    };
  }

  getDelayedJob(): DeployCommandsDelayedJob {
    if (!this._delayedJob) {
      throw new Error(
        '[DeployRecipesDelayedJob] Delayed job not initialized. Call createQueue() first.',
      );
    }
    return this._delayedJob;
  }

  getQueueName(): string {
    return 'deploy-recipes';
  }
}
