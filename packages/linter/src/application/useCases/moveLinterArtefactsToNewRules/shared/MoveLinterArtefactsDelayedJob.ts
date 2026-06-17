import { PackmindLogger } from '@packmind/logger';
import type { ILinterPort } from '@packmind/types';
import {
  AbstractAIDelayedJob,
  IQueue,
  QueueListeners,
  WorkerListeners,
} from '@packmind/node-utils';
import type {
  MoveLinterArtefactsToNewRulesCommand,
  MoveLinterArtefactsToNewRulesResponse,
} from '@packmind/types';
import { Job } from 'bullmq';
import { MoveLinterArtefactsToNewRulesUseCase } from '../MoveLinterArtefactsToNewRulesUseCase';
import { SoftDeleteLinterArtefactsByRuleUseCase } from '../../softDeleteLinterArtefactsByRule/SoftDeleteLinterArtefactsByRuleUseCase';
import { ILinterRepositories } from '../../../../domain/repositories/ILinterRepositories';

const origin = 'MoveLinterArtefactsDelayedJob';

export class MoveLinterArtefactsDelayedJob extends AbstractAIDelayedJob<
  MoveLinterArtefactsToNewRulesCommand,
  MoveLinterArtefactsToNewRulesResponse
> {
  readonly origin = 'MoveLinterArtefactsJob';

  constructor(
    queueFactory: (
      queueListeners: Partial<QueueListeners>,
    ) => Promise<
      IQueue<
        MoveLinterArtefactsToNewRulesCommand,
        MoveLinterArtefactsToNewRulesResponse
      >
    >,
    private readonly linterRepositories: ILinterRepositories,
    private readonly getLinterAdapter: () => ILinterPort,
  ) {
    super(queueFactory, new PackmindLogger(origin));
  }

  async onFail(jobId: string): Promise<void> {
    this.logger.error(
      `[${this.origin}] Job ${jobId} failed - move linter artefacts did not complete`,
    );
  }

  async runJob(
    jobId: string,
    input: MoveLinterArtefactsToNewRulesCommand,
    _controller: AbortController, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<MoveLinterArtefactsToNewRulesResponse> {
    this.logger.info(
      `[${this.origin}] Processing job ${jobId} for ${input.ruleMappings.length} rule mappings`,
    );

    const softDeleteUseCase = new SoftDeleteLinterArtefactsByRuleUseCase(
      this.linterRepositories,
    );

    const useCase = new MoveLinterArtefactsToNewRulesUseCase(
      this.getLinterAdapter(),
      softDeleteUseCase,
    );

    return await useCase.execute(input);
  }

  getJobName(
    _input: MoveLinterArtefactsToNewRulesCommand, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): string {
    return `move-linter-artefacts-${Date.now()}`;
  }

  jobStartedInfo(input: MoveLinterArtefactsToNewRulesCommand): string {
    return `ruleMappingsCount: ${input.ruleMappings.length}`;
  }

  getWorkerListener(): Partial<
    WorkerListeners<
      MoveLinterArtefactsToNewRulesCommand,
      MoveLinterArtefactsToNewRulesResponse
    >
  > {
    return {
      completed: async (
        job: Job<
          MoveLinterArtefactsToNewRulesCommand,
          MoveLinterArtefactsToNewRulesResponse,
          string
        >,
        result: MoveLinterArtefactsToNewRulesResponse,
      ) => {
        this.logger.info(
          `[${this.origin}] Job ${job.id} completed successfully`,
          {
            copiedCount: result.copiedCount,
            softDeletedCount: result.softDeletedCount,
          },
        );
      },
      failed: async (job, error) => {
        this.logger.error(
          `[${this.origin}] Job ${job.id} failed with error: ${error.message}`,
          {
            ruleMappingsCount: job.data.ruleMappings?.length ?? 0,
          },
        );
      },
    };
  }
}
