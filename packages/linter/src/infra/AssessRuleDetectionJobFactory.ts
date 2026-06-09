import { IJobFactory, IJobQueue, queueFactory } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  AssessRuleDetectionInput,
  IStandardsPort,
  ILinterPort,
  ILlmPort,
} from '@packmind/types';
import { AssessRuleDetectionDelayedJob } from '../application/useCases/assessRuleDetection/shared/AssessRuleDetectionDelayedJob';
import { ILinterRepositories } from '../domain/repositories/ILinterRepositories';

const origin = 'AssessRuleDetectionJobFactory';

export class AssessRuleDetectionJobFactory implements IJobFactory<AssessRuleDetectionInput> {
  public delayedJob: AssessRuleDetectionDelayedJob | null = null;

  constructor(
    private readonly linterRepositories: ILinterRepositories,
    private readonly getStandardsAdapter: () => IStandardsPort,
    private readonly getLinterAdapter: () => ILinterPort,
    private readonly getLlmPort: () => ILlmPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async createQueue(): Promise<IJobQueue<AssessRuleDetectionInput>> {
    this.logger.info('Creating AssessRuleDetection job queue');

    this.delayedJob = new AssessRuleDetectionDelayedJob(
      (listeners) => queueFactory(this.getQueueName(), listeners),
      this.linterRepositories,
      this.getStandardsAdapter,
      this.getLinterAdapter,
      this.getLlmPort,
    );

    // Wrap the delayed job to implement IJobQueue interface
    return {
      addJob: async (input: AssessRuleDetectionInput): Promise<string> => {
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
        // Initialize the queue using the public initialize method
        await this.delayedJob.initialize();
        this.logger.info('AssessRuleDetection queue initialized');
      },
      destroy: async (): Promise<void> => {
        // AbstractAIDelayedJob doesn't expose destroy method
        this.logger.info('AssessRuleDetection queue destroyed');
      },
    };
  }

  getQueueName(): string {
    return 'assess-rule-detection';
  }
}
