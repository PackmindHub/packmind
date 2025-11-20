import { IJobFactory, IJobQueue, queueFactory } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  IStandardsPort,
  ILinterAstPort,
  ILinterPort,
  ILlmPort,
} from '@packmind/types';
import { GenerateProgramInput } from '../domain';
import { GenerateProgramDelayedJob } from '../application/useCases/generateProgramUseCase/GenerateProgramDelayedJob';
import { ILinterRepositories } from '../domain/repositories/ILinterRepositories';

export class GenerateProgramJobFactory
  implements IJobFactory<GenerateProgramInput>
{
  public delayedJob: GenerateProgramDelayedJob | null = null;

  constructor(
    private readonly logger: PackmindLogger,
    private readonly linterRepositories: ILinterRepositories,
    private readonly getStandardsAdapter: () => IStandardsPort,
    private readonly getLinterAstAdapter: () => ILinterAstPort | null,
    private readonly getLinterAdapter: () => ILinterPort,
    private readonly llmPort: ILlmPort | null,
  ) {}

  async createQueue(): Promise<IJobQueue<GenerateProgramInput>> {
    this.logger.info('Creating GenerateProgram job queue');

    this.delayedJob = new GenerateProgramDelayedJob(
      (listeners) => queueFactory(this.getQueueName(), listeners),
      this.logger,
      this.linterRepositories,
      this.getStandardsAdapter,
      this.getLinterAstAdapter,
      this.getLinterAdapter,
      this.llmPort,
    );

    // Wrap the delayed job to implement IJobQueue interface
    return {
      addJob: async (input: GenerateProgramInput): Promise<string> => {
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
        this.logger.info('GenerateProgram queue initialized');
      },
      destroy: async (): Promise<void> => {
        // AbstractAIDelayedJob doesn't expose destroy method
        this.logger.info('GenerateProgram queue destroyed');
      },
    };
  }

  getQueueName(): string {
    return 'generate-program';
  }
}
