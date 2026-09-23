import { IJobFactory, IJobQueue, queueFactory } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import { IDeploymentPort } from '@packmind/types';
import { DeployCommandsDelayedJob } from '../../application/jobs/DeployCommandsDelayedJob';
import { DeployCommandsInput } from '../../domain/jobs/DeployCommands';
import {
  DeployCommandsDelayedJobNotCreatedError,
  DeployCommandsQueueNotInitializedError,
} from '../../domain/errors';

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
          throw new DeployCommandsQueueNotInitializedError();
        }
        const jobId = await this._delayedJob.addJob(input);
        return jobId;
      },
      initialize: async (): Promise<void> => {
        if (!this._delayedJob) {
          throw new DeployCommandsDelayedJobNotCreatedError();
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
      throw new DeployCommandsDelayedJobNotCreatedError();
    }
    return this._delayedJob;
  }

  getQueueName(): string {
    return 'deploy-recipes';
  }
}
