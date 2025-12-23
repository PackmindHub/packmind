import { IJobFactory, IJobQueue, queueFactory } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import { IDeploymentPort } from '@packmind/types';
import { DeployRecipesDelayedJob } from '../../application/jobs/DeployRecipesDelayedJob';
import { DeployRecipesInput } from '../../domain/jobs/DeployRecipes';

const origin = 'DeployRecipesJobFactory';

export class DeployRecipesJobFactory implements IJobFactory<DeployRecipesInput> {
  private _delayedJob: DeployRecipesDelayedJob | null = null;

  constructor(
    private readonly deploymentPort: IDeploymentPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async createQueue(): Promise<IJobQueue<DeployRecipesInput>> {
    this.logger.info('Creating DeployRecipes job queue');

    this._delayedJob = new DeployRecipesDelayedJob(
      (listeners) => queueFactory(this.getQueueName(), listeners),
      this.deploymentPort,
      this.logger,
    );

    return {
      addJob: async (input: DeployRecipesInput): Promise<string> => {
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

  getDelayedJob(): DeployRecipesDelayedJob {
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
