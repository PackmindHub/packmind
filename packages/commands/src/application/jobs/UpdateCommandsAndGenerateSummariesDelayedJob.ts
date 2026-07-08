import { PackmindLogger } from '@packmind/logger';
import { getErrorMessage } from '@packmind/node-utils';
import {
  AbstractAIDelayedJob,
  IQueue,
  QueueListeners,
  WorkerListeners,
} from '@packmind/node-utils';
import { Job } from 'bullmq';
import {
  UpdateCommandsAndGenerateSummariesInput,
  UpdateCommandsAndGenerateSummariesOutput,
} from '../../domain/jobs/UpdateCommandsAndGenerateSummaries';
import { CommandService } from '../services/CommandService';
import { CommandVersionService } from '../services/CommandVersionService';
import { CommandSummaryService } from '../services/CommandSummaryService';
import {
  AiNotConfigured,
  ISpacesPort,
  CommandVersionId,
} from '@packmind/types';

const logOrigin = 'UpdateRecipesAndGenerateSummariesDelayedJob';

/**
 * Callback function type for job completion
 */
export type UpdateCommandsAndGenerateSummariesCallback = (
  result: UpdateCommandsAndGenerateSummariesOutput,
) => Promise<void> | void;

export class UpdateCommandsAndGenerateSummariesDelayedJob extends AbstractAIDelayedJob<
  UpdateCommandsAndGenerateSummariesInput,
  UpdateCommandsAndGenerateSummariesOutput
> {
  readonly origin = logOrigin;

  /**
   * In-memory registry of callbacks keyed by job ID
   * Callbacks are stored here because they cannot be serialized to Redis
   */
  private readonly callbacks = new Map<
    string,
    UpdateCommandsAndGenerateSummariesCallback
  >();

  constructor(
    queueFactory: (
      queueListeners: Partial<QueueListeners>,
    ) => Promise<
      IQueue<
        UpdateCommandsAndGenerateSummariesInput,
        UpdateCommandsAndGenerateSummariesOutput
      >
    >,
    private readonly commandService: CommandService,
    private readonly commandVersionService: CommandVersionService,
    private readonly commandSummaryService: CommandSummaryService,
    private readonly spacesPort: ISpacesPort,
    logger: PackmindLogger = new PackmindLogger(logOrigin),
  ) {
    super(queueFactory, logger);
  }

  /**
   * Add a job with an optional completion callback.
   * The callback will be executed when the job completes successfully.
   *
   * @param input - The job input data
   * @param onComplete - Optional callback to execute when the job completes
   * @returns The job ID
   */
  async addJobWithCallback(
    input: UpdateCommandsAndGenerateSummariesInput,
    onComplete?: UpdateCommandsAndGenerateSummariesCallback,
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
      `[${this.origin}] Job ${jobId} failed - recipes could not be updated`,
    );

    // Clean up callback on failure
    if (this.callbacks.has(jobId)) {
      this.callbacks.delete(jobId);
      this.logger.info(
        `[${this.origin}] Removed callback for failed job ${jobId}`,
      );
    }
  }

  async runJob(
    jobId: string,
    input: UpdateCommandsAndGenerateSummariesInput,
    _controller: AbortController, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<UpdateCommandsAndGenerateSummariesOutput> {
    this.logger.info(
      `[${this.origin}] Processing job ${jobId} to update recipes and generate summaries for ${input.files.length} files`,
      {
        gitRepoId: input.gitRepoId,
        filesCount: input.files.length,
      },
    );

    const newCommandVersionIds: CommandVersionId[] = [];
    const affectedTargetPaths: string[] = [];

    for (const file of input.files) {
      const { filePath, fileContent, gitCommit } = file;

      this.logger.info(`[${this.origin}] Processing recipe file: ${filePath}`);

      // Extract target path and slug from file path
      const [targetPath, slug] =
        `${filePath.startsWith('/') ? '' : '/'}${filePath}`
          .replace(/\.md$/, '')
          .split('.packmind/recipes/');

      this.logger.debug(`[${this.origin}] Extracted path info`, {
        targetPath,
        slug,
        filePath,
      });

      // Check if this recipe should be processed (based on deployment info)
      const deploymentInfo = input.recipeDeploymentInfo[slug];

      if (!deploymentInfo) {
        this.logger.info(
          `[${this.origin}] Skipping recipe ${slug} - not in deployment info`,
        );
        continue;
      }

      if (!deploymentInfo.isDeployedToTarget) {
        this.logger.info(
          `[${this.origin}] Skipping recipe ${slug} - not deployed to target ${targetPath}`,
        );
        continue;
      }

      // Check if recipe exists in database
      const existingCommand = await this.commandService.findCommandBySlug(
        slug,
        input.organizationId,
      );

      if (!existingCommand) {
        this.logger.warn(
          `[${this.origin}] Recipe not found in database, skipping: ${slug}`,
          {
            slug,
            organizationId: input.organizationId,
          },
        );
        continue;
      }

      this.logger.info(
        `[${this.origin}] Recipe found, checking if content differs`,
        {
          slug,
          recipeId: existingCommand.id,
        },
      );

      // Compare content to see if update is needed
      const contentHasChanged = existingCommand.content !== fileContent;

      if (!contentHasChanged) {
        this.logger.info(
          `[${this.origin}] Content is identical, skipping update for ${slug}`,
        );
        continue;
      }

      this.logger.info(
        `[${this.origin}] Content has changed, updating recipe: ${slug}`,
      );

      // Business logic: Increment version number
      const nextVersion = existingCommand.version + 1;

      // Update the recipe entity
      await this.commandService.updateCommand(existingCommand.id, {
        name: existingCommand.name,
        slug: existingCommand.slug,
        content: fileContent,
        version: nextVersion,
        gitCommit,
        userId: existingCommand.userId,
      });

      // Generate summary for the recipe version
      let summary: string | null = null;
      try {
        this.logger.debug(
          `[${this.origin}] Generating summary for recipe version`,
        );
        summary = await this.commandSummaryService.createCommandSummary(
          input.organizationId,
          {
            recipeId: existingCommand.id,
            name: existingCommand.name,
            slug: existingCommand.slug,
            content: fileContent,
            version: nextVersion,
            summary: null,
            gitCommit,
            userId: null, // Git commits don't have a specific user
          },
        );
        this.logger.debug(`[${this.origin}] Summary generated successfully`, {
          summaryLength: summary.length,
        });
      } catch (summaryError) {
        if (summaryError instanceof AiNotConfigured) {
          this.logger.warn(
            `[${this.origin}] AI service not configured - reusing previous summary`,
            {
              recipeSlug: existingCommand.slug,
              error: summaryError.message,
            },
          );
        } else {
          this.logger.warn(
            `[${this.origin}] Failed to generate summary - reusing previous summary`,
            {
              recipeSlug: existingCommand.slug,
              error: getErrorMessage(summaryError),
            },
          );
        }
      }

      // If no new summary was generated, reuse the previous version's summary
      if (!summary) {
        const spaces = await this.spacesPort.listSpacesByOrganization(
          input.organizationId,
        );
        const allowedSpaceIds = spaces.map((s) => s.id);

        const previousVersion =
          await this.commandVersionService.getCommandVersion(
            existingCommand.id,
            existingCommand.version,
            allowedSpaceIds,
          );
        if (previousVersion?.summary) {
          summary = previousVersion.summary;
          this.logger.info(
            `[${this.origin}] Reusing summary from previous version`,
            {
              recipeSlug: existingCommand.slug,
              previousVersion: existingCommand.version,
            },
          );
        }
      }

      // Create new recipe version with summary
      const newCommandVersion =
        await this.commandVersionService.addCommandVersion({
          recipeId: existingCommand.id,
          name: existingCommand.name,
          slug: existingCommand.slug,
          content: fileContent,
          version: nextVersion,
          summary,
          gitCommit,
          userId: null, // Git commits don't have a specific user
        });

      if (newCommandVersion) {
        newCommandVersionIds.push(newCommandVersion.id);
        if (!affectedTargetPaths.includes(targetPath)) {
          affectedTargetPaths.push(targetPath);
        }

        this.logger.info(
          `[${this.origin}] Recipe updated successfully: ${slug}`,
          {
            recipeId: existingCommand.id,
            newVersion: nextVersion,
            targetPath,
          },
        );
      }
    }

    this.logger.info(`[${this.origin}] Successfully processed job ${jobId}`, {
      gitRepoId: input.gitRepoId,
      totalFiles: input.files.length,
      updatedRecipes: newCommandVersionIds.length,
    });

    return {
      organizationId: input.organizationId,
      gitRepoId: input.gitRepoId,
      recipeVersionIds: newCommandVersionIds,
      affectedTargetPaths,
    };
  }

  getJobName(input: UpdateCommandsAndGenerateSummariesInput): string {
    return `update-recipes-generate-summaries-${input.gitRepoId}-${Date.now()}`;
  }

  jobStartedInfo(input: UpdateCommandsAndGenerateSummariesInput): string {
    return `repo: ${input.gitRepoId}, files: ${input.files.length}`;
  }

  getWorkerListener(): Partial<
    WorkerListeners<
      UpdateCommandsAndGenerateSummariesInput,
      UpdateCommandsAndGenerateSummariesOutput
    >
  > {
    return {
      completed: async (
        job: Job<
          UpdateCommandsAndGenerateSummariesInput,
          UpdateCommandsAndGenerateSummariesOutput,
          string
        >,
        result: UpdateCommandsAndGenerateSummariesOutput,
      ) => {
        this.logger.info(
          `[${this.origin}] Job ${job.id} completed successfully`,
          {
            updatedRecipesCount: result.recipeVersionIds.length,
          },
        );

        // Execute callback if one was registered
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
              // Don't throw - callback errors shouldn't fail the job
            }
          }

          // Clean up callback after execution
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
