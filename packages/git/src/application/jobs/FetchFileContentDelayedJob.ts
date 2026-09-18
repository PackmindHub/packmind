import { PackmindLogger } from '@packmind/logger';
import {
  AbstractAIDelayedJob,
  getErrorMessage,
  IQueue,
  QueueListeners,
  WorkerListeners,
} from '@packmind/node-utils';
import { Job } from 'bullmq';
import {
  FetchFileContentInput,
  FetchFileContentOutput,
} from '../../domain/jobs/FetchFileContent';
import { GitRepoService } from '../GitRepoService';
import { GetFileFromRepoUseCase } from '../useCases/getFileFromRepo/GetFileFromRepoUseCase';

const logOrigin = 'FetchFileContentDelayedJob';

export type FetchFileContentCallback = (
  result: FetchFileContentOutput,
) => Promise<void> | void;

export class FetchFileContentDelayedJob extends AbstractAIDelayedJob<
  FetchFileContentInput,
  FetchFileContentOutput
> {
  readonly origin = logOrigin;

  // Kept in memory rather than on the job payload: callbacks cannot be
  // serialized to Redis.
  private readonly callbacks = new Map<string, FetchFileContentCallback>();

  constructor(
    queueFactory: (
      queueListeners: Partial<QueueListeners>,
    ) => Promise<IQueue<FetchFileContentInput, FetchFileContentOutput>>,
    private readonly gitRepoService: GitRepoService,
    private readonly getFileFromRepo: GetFileFromRepoUseCase,
    logger: PackmindLogger = new PackmindLogger(logOrigin),
  ) {
    super(queueFactory, logger);
  }

  async addJobWithCallback(
    input: FetchFileContentInput,
    onComplete?: FetchFileContentCallback,
  ): Promise<string> {
    const jobId = await this.addJob(input);

    if (onComplete) {
      this.callbacks.set(jobId, onComplete);
      this.logger.info(`[${this.origin}] Registered callback for job ${jobId}`);
    }

    return jobId;
  }

  async onFail(jobId: string): Promise<void> {
    this.logger.error(
      `[${this.origin}] Job ${jobId} failed - file content could not be fetched`,
    );

    if (this.callbacks.has(jobId)) {
      this.callbacks.delete(jobId);
      this.logger.info(
        `[${this.origin}] Removed callback for failed job ${jobId}`,
      );
    }
  }

  async runJob(
    jobId: string,
    input: FetchFileContentInput,
    _controller: AbortController, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<FetchFileContentOutput> {
    this.logger.info(
      `[${this.origin}] Processing job ${jobId} to fetch file content for ${input.files.length} files`,
      {
        gitRepoId: input.gitRepoId,
        filesCount: input.files.length,
      },
    );

    const gitRepo = await this.gitRepoService.findGitRepoById(input.gitRepoId);

    if (!gitRepo) {
      throw new Error(`Git repository not found with id: ${input.gitRepoId}`);
    }

    const filesWithContent = [];

    for (const file of input.files) {
      this.logger.info(
        `[${this.origin}] Fetching content for file: ${file.filePath} at commit: ${file.gitCommit.sha}`,
      );

      const fileData = await this.getFileFromRepo.getFileFromRepo(
        gitRepo,
        file.filePath,
        file.gitCommit.sha,
      );

      if (!fileData) {
        this.logger.warn(
          `[${this.origin}] File not found at path: ${file.filePath} in commit: ${file.gitCommit.sha}`,
        );
        // A missing file must not fail the whole batch.
        continue;
      }

      filesWithContent.push({
        gitCommit: file.gitCommit,
        filePath: file.filePath,
        fileContent: fileData.content,
      });

      this.logger.info(
        `[${this.origin}] Successfully fetched content for file: ${file.filePath}`,
        {
          contentLength: fileData.content.length,
        },
      );
    }

    this.logger.info(
      `[${this.origin}] Successfully fetched file content for job ${jobId}`,
      {
        gitRepoId: input.gitRepoId,
        totalFiles: input.files.length,
        successfulFiles: filesWithContent.length,
      },
    );

    return {
      organizationId: input.organizationId,
      gitRepoId: input.gitRepoId,
      files: filesWithContent,
    };
  }

  getJobName(input: FetchFileContentInput): string {
    return `fetch-file-content-${input.gitRepoId}-${Date.now()}`;
  }

  jobStartedInfo(input: FetchFileContentInput): string {
    return `repo: ${input.gitRepoId}, files: ${input.files.length}`;
  }

  getWorkerListener(): Partial<
    WorkerListeners<FetchFileContentInput, FetchFileContentOutput>
  > {
    return {
      completed: async (
        job: Job<FetchFileContentInput, FetchFileContentOutput, string>,
        result: FetchFileContentOutput,
      ) => {
        this.logger.info(
          `[${this.origin}] Job ${job.id} completed successfully`,
          {
            filesCount: result.files.length,
          },
        );

        if (job.id && this.callbacks.has(job.id)) {
          const callback = this.callbacks.get(job.id);

          if (callback) {
            this.logger.info(
              `[${this.origin}] Executing callback for job ${job.id}`,
            );

            try {
              await callback(result);
              this.logger.info(
                `[${this.origin}] Callback executed successfully for job ${job.id}`,
              );
            } catch (error) {
              this.logger.error(
                `[${this.origin}] Callback failed for job ${job.id}: ${getErrorMessage(error)}`,
              );
              // Swallowed: a broken callback must not fail the job.
            }
          }

          this.callbacks.delete(job.id);
          this.logger.info(
            `[${this.origin}] Removed callback for completed job ${job.id}`,
          );
        }
      },
      failed: async (job, error) => {
        this.logger.error(
          `[${this.origin}] Job ${job.id} failed with error: ${getErrorMessage(error)}`,
        );
      },
    };
  }
}
