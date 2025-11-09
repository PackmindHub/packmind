import { PackmindLogger } from '@packmind/logger';
import { getErrorMessage } from '@packmind/node-utils';
import {
  AbstractAIDelayedJob,
  IQueue,
  QueueListeners,
  WorkerListeners,
} from '@packmind/jobs';
import { Job } from 'bullmq';
import {
  UpdateRecipesAndGenerateSummariesInput,
  UpdateRecipesAndGenerateSummariesOutput,
} from '../../domain/jobs/UpdateRecipesAndGenerateSummaries';
import { RecipeService } from '../services/RecipeService';
import { RecipeVersionService } from '../services/RecipeVersionService';
import { RecipeSummaryService } from '../services/RecipeSummaryService';
import { RecipeVersionId } from '@packmind/types';

const logOrigin = 'UpdateRecipesAndGenerateSummariesDelayedJob';

/**
 * Callback function type for job completion
 */
export type UpdateRecipesAndGenerateSummariesCallback = (
  result: UpdateRecipesAndGenerateSummariesOutput,
) => Promise<void> | void;

export class UpdateRecipesAndGenerateSummariesDelayedJob extends AbstractAIDelayedJob<
  UpdateRecipesAndGenerateSummariesInput,
  UpdateRecipesAndGenerateSummariesOutput
> {
  readonly origin = logOrigin;

  /**
   * In-memory registry of callbacks keyed by job ID
   * Callbacks are stored here because they cannot be serialized to Redis
   */
  private readonly callbacks = new Map<
    string,
    UpdateRecipesAndGenerateSummariesCallback
  >();

  constructor(
    queueFactory: (
      queueListeners: Partial<QueueListeners>,
    ) => Promise<
      IQueue<
        UpdateRecipesAndGenerateSummariesInput,
        UpdateRecipesAndGenerateSummariesOutput
      >
    >,
    private readonly recipeService: RecipeService,
    private readonly recipeVersionService: RecipeVersionService,
    private readonly recipeSummaryService: RecipeSummaryService,
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
    input: UpdateRecipesAndGenerateSummariesInput,
    onComplete?: UpdateRecipesAndGenerateSummariesCallback,
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
    input: UpdateRecipesAndGenerateSummariesInput,
    _controller: AbortController, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<UpdateRecipesAndGenerateSummariesOutput> {
    this.logger.info(
      `[${this.origin}] Processing job ${jobId} to update recipes and generate summaries for ${input.files.length} files`,
      {
        gitRepoId: input.gitRepoId,
        filesCount: input.files.length,
      },
    );

    const newRecipeVersionIds: RecipeVersionId[] = [];
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
      const existingRecipe = await this.recipeService.findRecipeBySlug(
        slug,
        input.organizationId,
      );

      if (!existingRecipe) {
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
          recipeId: existingRecipe.id,
        },
      );

      // Compare content to see if update is needed
      const contentHasChanged = existingRecipe.content !== fileContent;

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
      const nextVersion = existingRecipe.version + 1;

      // Update the recipe entity
      await this.recipeService.updateRecipe(existingRecipe.id, {
        name: existingRecipe.name,
        slug: existingRecipe.slug,
        content: fileContent,
        version: nextVersion,
        gitCommit,
        userId: existingRecipe.userId,
      });

      // Generate summary for the recipe version
      let summary: string | null = null;
      try {
        this.logger.debug(
          `[${this.origin}] Generating summary for recipe version`,
        );
        summary = await this.recipeSummaryService.createRecipeSummary({
          recipeId: existingRecipe.id,
          name: existingRecipe.name,
          slug: existingRecipe.slug,
          content: fileContent,
          version: nextVersion,
          summary: null,
          gitCommit,
          userId: null, // Git commits don't have a specific user
        });
        this.logger.debug(`[${this.origin}] Summary generated successfully`, {
          summaryLength: summary.length,
        });
      } catch (summaryError) {
        this.logger.error(
          `[${this.origin}] Failed to generate summary, proceeding without summary`,
          {
            error: getErrorMessage(summaryError),
          },
        );
      }

      // Create new recipe version with summary
      const newRecipeVersion = await this.recipeVersionService.addRecipeVersion(
        {
          recipeId: existingRecipe.id,
          name: existingRecipe.name,
          slug: existingRecipe.slug,
          content: fileContent,
          version: nextVersion,
          summary,
          gitCommit,
          userId: null, // Git commits don't have a specific user
        },
      );

      if (newRecipeVersion) {
        newRecipeVersionIds.push(newRecipeVersion.id);
        if (!affectedTargetPaths.includes(targetPath)) {
          affectedTargetPaths.push(targetPath);
        }

        this.logger.info(
          `[${this.origin}] Recipe updated successfully: ${slug}`,
          {
            recipeId: existingRecipe.id,
            newVersion: nextVersion,
            targetPath,
          },
        );
      }
    }

    this.logger.info(`[${this.origin}] Successfully processed job ${jobId}`, {
      gitRepoId: input.gitRepoId,
      totalFiles: input.files.length,
      updatedRecipes: newRecipeVersionIds.length,
    });

    return {
      organizationId: input.organizationId,
      gitRepoId: input.gitRepoId,
      recipeVersionIds: newRecipeVersionIds,
      affectedTargetPaths,
    };
  }

  getJobName(input: UpdateRecipesAndGenerateSummariesInput): string {
    return `update-recipes-generate-summaries-${input.gitRepoId}-${Date.now()}`;
  }

  jobStartedInfo(input: UpdateRecipesAndGenerateSummariesInput): string {
    return `repo: ${input.gitRepoId}, files: ${input.files.length}`;
  }

  getWorkerListener(): Partial<
    WorkerListeners<
      UpdateRecipesAndGenerateSummariesInput,
      UpdateRecipesAndGenerateSummariesOutput
    >
  > {
    return {
      completed: async (
        job: Job<
          UpdateRecipesAndGenerateSummariesInput,
          UpdateRecipesAndGenerateSummariesOutput,
          string
        >,
        result: UpdateRecipesAndGenerateSummariesOutput,
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
