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
  GitProviderAuthTypes,
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
    this.logger.info(
      `[${this.origin}] Processing job ${jobId} for distribution ${input.distributionId}`,
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

    const provider = await this.gitPort.getProviderById(gitRepo.providerId);
    if (!provider) {
      throw new Error(
        `Git provider not found for repository: ${input.gitRepoId}`,
      );
    }

    const usePullRequestFlow =
      provider.authType === GitProviderAuthTypes.github_app;

    let gitCommit: GitCommit | undefined;
    let pullRequestUrl: string | undefined;
    let status: DistributionStatus = DistributionStatus.success;

    try {
      if (usePullRequestFlow) {
        const result = await this.gitPort.commitAndOpenPullRequest({
          repo: gitRepo,
          files: input.fileUpdates.createOrUpdate,
          commitMessage: input.commitMessage,
          pullRequest: {
            title: input.pullRequestTitle,
            body: input.pullRequestBody,
          },
          deleteFiles: input.fileUpdates.delete,
        });
        gitCommit = result.commit;
        pullRequestUrl = result.pullRequestUrl;

        this.logger.info(
          `[${this.origin}] Successfully opened/updated pull request`,
          {
            jobId,
            commitSha: gitCommit.sha,
            pullRequestUrl,
            filesCreatedOrUpdated: input.fileUpdates.createOrUpdate.length,
            filesDeleted: input.fileUpdates.delete.length,
          },
        );
      } else {
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
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'NO_CHANGES_DETECTED') {
        this.logger.info(
          `[${this.origin}] No changes detected for distribution ${input.distributionId}`,
        );
        status = DistributionStatus.no_changes;
        gitCommit = undefined;
      } else {
        throw error;
      }
    }

    return {
      distributionId: input.distributionId,
      organizationId: input.organizationId,
      success: true,
      status,
      gitCommit,
      pullRequestUrl,
    };
  }

  getJobName(input: PublishArtifactsJobInput): string {
    return `publish-artifacts-${input.distributionId}`;
  }

  jobStartedInfo(input: PublishArtifactsJobInput): string {
    return `distributionId: ${input.distributionId}`;
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
            distributionId: result.distributionId,
            status: result.status,
          },
        );

        try {
          // Update distribution status in the database
          await this.distributionRepository.updateStatus(
            result.distributionId,
            result.status,
            result.gitCommit,
            undefined,
            result.pullRequestUrl
              ? { pullRequestUrl: result.pullRequestUrl }
              : undefined,
          );

          this.logger.info(
            `[${this.origin}] Updated distribution status for ${result.distributionId}`,
            { status: result.status },
          );

          // Publish SSE event to notify frontend of status change
          await SSEEventPublisher.publishDistributionStatusChangeEvent(
            result.distributionId,
            result.status,
            result.organizationId,
          );

          this.logger.info(
            `[${this.origin}] Published SSE event for distribution ${result.distributionId}`,
          );
        } catch (error) {
          this.logger.error(
            `[${this.origin}] Failed to update distribution status for job ${job.id}`,
            { error: getErrorMessage(error) },
          );
          // Note: We don't throw here to avoid marking the job as failed
          // since the git commit itself was successful
        }
      },
      failed: async (job, error) => {
        this.logger.error(
          `[${this.origin}] Job ${job.id} failed with error: ${getErrorMessage(error)}`,
        );

        try {
          // Update distribution to failure status with error message
          await this.distributionRepository.updateStatus(
            job.data.distributionId,
            DistributionStatus.failure,
            undefined,
            getErrorMessage(error),
          );

          this.logger.info(
            `[${this.origin}] Updated distribution ${job.data.distributionId} to failure status`,
          );

          // Publish SSE event to notify frontend of failure
          await SSEEventPublisher.publishDistributionStatusChangeEvent(
            job.data.distributionId,
            DistributionStatus.failure,
            job.data.organizationId,
          );

          this.logger.info(
            `[${this.origin}] Published SSE failure event for distribution ${job.data.distributionId}`,
          );
        } catch (updateError) {
          this.logger.error(
            `[${this.origin}] Failed to update distribution failure status for job ${job.id}`,
            { error: getErrorMessage(updateError) },
          );
        }
      },
    };
  }
}
