import { PackmindLogger } from '@packmind/logger';
import {
  AbstractAIDelayedJob,
  getErrorMessage,
  IQueue,
  QueueListeners,
  SSEEventPublisher,
  WorkerListeners,
} from '@packmind/node-utils';
import {
  DistributionStatus,
  GitCommit,
  IGitPort,
  NoChangesDetectedError,
} from '@packmind/types';
import { Job } from 'bullmq';
import {
  distributionIdsOf,
  PublishArtifactsJobInput,
  PublishArtifactsJobOutput,
} from '../../domain/jobs/PublishArtifactsJob';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { GitRepositoryNotFoundError } from '../../domain/errors/GitRepositoryNotFoundError';

const logOrigin = 'PublishArtifactsDelayedJob';

/**
 * Commits the artifacts asynchronously, then updates the status of every
 * distribution the commit fulfils — a repository gets one job for all of its
 * targets, so moving only the first one's would leave the rest reading as
 * 'Distributing now' forever.
 */
export class PublishArtifactsDelayedJob extends AbstractAIDelayedJob<
  PublishArtifactsJobInput,
  PublishArtifactsJobOutput
> {
  readonly origin = logOrigin;

  constructor(
    queueFactory: (
      queueListeners: Partial<QueueListeners>,
    ) => Promise<IQueue<PublishArtifactsJobInput, PublishArtifactsJobOutput>>,
    private readonly distributionRepository: IDistributionRepository,
    private readonly gitPort: IGitPort,
    logger: PackmindLogger = new PackmindLogger(logOrigin),
  ) {
    super(queueFactory, logger);
  }

  async onFail(jobId: string): Promise<void> {
    this.logger.error(
      `[${this.origin}] Job ${jobId} failed - status will be updated in failed listener`,
    );
  }

  async runJob(
    jobId: string,
    input: PublishArtifactsJobInput,
    _controller: AbortController, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<PublishArtifactsJobOutput> {
    const distributionIds = distributionIdsOf(input);

    this.logger.info(
      `[${this.origin}] Processing job ${jobId} for distributions ${distributionIds.join(', ')}`,
      {
        gitRepoId: input.gitRepoId,
        filesCount: input.fileUpdates.createOrUpdate.length,
        deleteFilesCount: input.fileUpdates.delete.length,
        deletePaths: input.fileUpdates.delete.map((d) => d.path),
        createOrUpdatePaths: input.fileUpdates.createOrUpdate.map(
          (f) => f.path,
        ),
      },
    );

    const gitRepo = await this.gitPort.getRepositoryById(input.gitRepoId);
    if (!gitRepo) {
      throw new GitRepositoryNotFoundError(input.gitRepoId);
    }

    let gitCommit: GitCommit | undefined;
    let status: DistributionStatus = DistributionStatus.success;

    try {
      gitCommit = await this.gitPort.commitToGit(
        gitRepo,
        input.fileUpdates.createOrUpdate,
        input.commitMessage,
        input.fileUpdates.delete,
      );

      this.logger.info(`[${this.origin}] Successfully committed artifacts`, {
        jobId,
        commitSha: gitCommit.sha,
        filesCreatedOrUpdated: input.fileUpdates.createOrUpdate.length,
        filesDeleted: input.fileUpdates.delete.length,
      });
    } catch (error) {
      if (error instanceof NoChangesDetectedError) {
        this.logger.info(
          `[${this.origin}] No changes detected for distributions ${distributionIds.join(', ')}`,
        );
        status = DistributionStatus.no_changes;
        gitCommit = undefined;
      } else {
        throw error;
      }
    }

    return {
      distributionIds,
      organizationId: input.organizationId,
      success: true,
      status,
      gitCommit,
    };
  }

  getJobName(input: PublishArtifactsJobInput): string {
    return `publish-artifacts-${distributionIdsOf(input).join('-')}`;
  }

  jobStartedInfo(input: PublishArtifactsJobInput): string {
    return `distributionIds: ${distributionIdsOf(input).join(', ')}`;
  }

  getWorkerListener(): Partial<
    WorkerListeners<PublishArtifactsJobInput, PublishArtifactsJobOutput>
  > {
    return {
      completed: async (
        job: Job<PublishArtifactsJobInput, PublishArtifactsJobOutput, string>,
        result: PublishArtifactsJobOutput,
      ) => {
        const distributionIds = result.distributionIds ?? [];

        this.logger.info(
          `[${this.origin}] Job ${job.id} completed successfully`,
          {
            distributionIds,
            status: result.status,
          },
        );

        for (const distributionId of distributionIds) {
          try {
            await this.distributionRepository.updateStatus(
              distributionId,
              result.status,
              result.gitCommit,
            );

            this.logger.info(
              `[${this.origin}] Updated distribution status for ${distributionId}`,
              { status: result.status },
            );

            await SSEEventPublisher.publishDistributionStatusChangeEvent(
              distributionId,
              result.status,
              result.organizationId,
            );

            this.logger.info(
              `[${this.origin}] Published SSE event for distribution ${distributionId}`,
            );
          } catch (error) {
            this.logger.error(
              `[${this.origin}] Failed to update distribution status for job ${job.id}`,
              { distributionId, error: getErrorMessage(error) },
            );
            // Not rethrown: the git commit itself succeeded, so the job must
            // not be marked failed. The loop goes on, so one distribution
            // failing to update does not strand the others.
          }
        }
      },
      failed: async (job, error) => {
        this.logger.error(
          `[${this.origin}] Job ${job.id} failed with error: ${getErrorMessage(error)}`,
        );

        for (const distributionId of distributionIdsOf(job.data)) {
          try {
            await this.distributionRepository.updateStatus(
              distributionId,
              DistributionStatus.failure,
              undefined,
              getErrorMessage(error),
            );

            this.logger.info(
              `[${this.origin}] Updated distribution ${distributionId} to failure status`,
            );

            await SSEEventPublisher.publishDistributionStatusChangeEvent(
              distributionId,
              DistributionStatus.failure,
              job.data.organizationId,
            );

            this.logger.info(
              `[${this.origin}] Published SSE failure event for distribution ${distributionId}`,
            );
          } catch (updateError) {
            this.logger.error(
              `[${this.origin}] Failed to update distribution failure status for job ${job.id}`,
              { distributionId, error: getErrorMessage(updateError) },
            );
          }
        }
      },
    };
  }
}
