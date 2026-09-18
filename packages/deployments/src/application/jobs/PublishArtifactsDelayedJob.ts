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
  DistributionId,
  DistributionStatus,
  GitCommit,
  IGitPort,
} from '@packmind/types';
import { Job } from 'bullmq';
import {
  PublishArtifactsJobInput,
  PublishArtifactsJobOutput,
} from '../../domain/jobs/PublishArtifactsJob';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';

const logOrigin = 'PublishArtifactsDelayedJob';

/**
 * The payload shape this queue carried before one job covered every target of a
 * repository. Jobs live in Redis under an unchanged queue name, so a job
 * enqueued by the previous release is still waiting there after a deploy and
 * reaches this worker with a single `distributionId`.
 */
type LegacyPublishArtifactsJobInput = {
  distributionId?: DistributionId;
};

/**
 * Reads the distributions of a job in either payload shape, so a job enqueued
 * before the deploy finalizes its distribution instead of failing on a missing
 * array and leaving it in_progress forever.
 */
function readDistributionIds(
  input: PublishArtifactsJobInput & LegacyPublishArtifactsJobInput,
): DistributionId[] {
  if (input.distributionIds?.length) {
    return input.distributionIds;
  }
  return input.distributionId ? [input.distributionId] : [];
}

/**
 * Delayed job for publishing artifacts to git repositories.
 * Performs git commits asynchronously and updates distribution status on completion.
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
    const distributionIds = readDistributionIds(input);

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

    // Fetch the git repository
    const gitRepo = await this.gitPort.getRepositoryById(input.gitRepoId);
    if (!gitRepo) {
      throw new Error(`Git repository not found with id: ${input.gitRepoId}`);
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
      if (error instanceof Error && error.message === 'NO_CHANGES_DETECTED') {
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
    return `publish-artifacts-${readDistributionIds(input).join('-')}`;
  }

  jobStartedInfo(input: PublishArtifactsJobInput): string {
    return `distributionIds: ${readDistributionIds(input).join(', ')}`;
  }

  getWorkerListener(): Partial<
    WorkerListeners<PublishArtifactsJobInput, PublishArtifactsJobOutput>
  > {
    return {
      completed: async (
        job: Job<PublishArtifactsJobInput, PublishArtifactsJobOutput, string>,
        result: PublishArtifactsJobOutput,
      ) => {
        this.logger.info(
          `[${this.origin}] Job ${job.id} completed successfully`,
          {
            distributionIds: result.distributionIds,
            status: result.status,
          },
        );

        // One commit covers every target of the repository, so every one of
        // their distributions moves out of in_progress together. Each is
        // finalized on its own: one that cannot be updated must not strand the
        // rest in in_progress.
        for (const distributionId of result.distributionIds) {
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

            // Publish SSE event to notify frontend of status change
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
              `[${this.origin}] Failed to update distribution status for ${distributionId} of job ${job.id}`,
              { error: getErrorMessage(error) },
            );
            // Note: We don't throw here to avoid marking the job as failed
            // since the git commit itself was successful
          }
        }
      },
      failed: async (job, error) => {
        this.logger.error(
          `[${this.origin}] Job ${job.id} failed with error: ${getErrorMessage(error)}`,
        );

        // The commit failed for the whole repository, so every target's
        // distribution fails with it, each on its own so that one that cannot
        // be updated does not strand the rest in in_progress.
        for (const distributionId of readDistributionIds(job.data)) {
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

            // Publish SSE event to notify frontend of failure
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
              `[${this.origin}] Failed to update distribution ${distributionId} to failure status for job ${job.id}`,
              { error: getErrorMessage(updateError) },
            );
          }
        }
      },
    };
  }
}
