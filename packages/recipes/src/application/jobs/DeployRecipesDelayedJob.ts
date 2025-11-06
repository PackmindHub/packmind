import { PackmindLogger } from '@packmind/logger';
import { getErrorMessage } from '@packmind/shared';
import { IDeploymentPort } from '@packmind/types';
import {
  AbstractAIDelayedJob,
  IQueue,
  QueueListeners,
  WorkerListeners,
} from '@packmind/jobs';
import { Job } from 'bullmq';
import {
  DeployRecipesInput,
  DeployRecipesOutput,
} from '../../domain/jobs/DeployRecipes';
import { createUserId } from '@packmind/accounts';

const logOrigin = 'DeployRecipesDelayedJob';

/**
 * Callback function type for job completion
 */
export type DeployRecipesCallback = (
  result: DeployRecipesOutput,
) => Promise<void> | void;

export class DeployRecipesDelayedJob extends AbstractAIDelayedJob<
  DeployRecipesInput,
  DeployRecipesOutput
> {
  readonly origin = logOrigin;

  /**
   * In-memory registry of callbacks keyed by job ID
   * Callbacks are stored here because they cannot be serialized to Redis
   */
  private readonly callbacks = new Map<string, DeployRecipesCallback>();

  constructor(
    queueFactory: (
      queueListeners: Partial<QueueListeners>,
    ) => Promise<IQueue<DeployRecipesInput, DeployRecipesOutput>>,
    private readonly deploymentPort: IDeploymentPort,
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
    input: DeployRecipesInput,
    onComplete?: DeployRecipesCallback,
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
      `[${this.origin}] Job ${jobId} failed - recipes could not be deployed`,
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
    input: DeployRecipesInput,
    _controller: AbortController, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<DeployRecipesOutput> {
    this.logger.info(
      `[${this.origin}] Processing job ${jobId} to deploy ${input.recipeVersionIds.length} recipe versions`,
      {
        gitRepoId: input.gitRepoId,
        recipeVersionsCount: input.recipeVersionIds.length,
        affectedTargetPaths: input.affectedTargetPaths,
      },
    );

    if (input.recipeVersionIds.length === 0) {
      this.logger.info(
        `[${this.origin}] No recipe versions to deploy, skipping`,
      );
      return {
        organizationId: input.organizationId,
        gitRepoId: input.gitRepoId,
        deployedVersionsCount: 0,
        targetCount: 0,
      };
    }

    try {
      // Get all targets for this repository
      const allTargets = await this.deploymentPort.getTargetsByGitRepo({
        gitRepoId: input.gitRepoId,
        organizationId: input.organizationId,
        userId: createUserId('system'),
      });

      // Filter targets to only those that match the affected target paths
      const targetIdsToDeployTo = allTargets
        .filter((target) => input.affectedTargetPaths.includes(target.path))
        .map((target) => target.id);

      if (targetIdsToDeployTo.length === 0) {
        this.logger.warn(
          `[${this.origin}] No matching targets found for affected paths, skipping deployment`,
          {
            affectedTargetPaths: input.affectedTargetPaths,
            gitRepoId: input.gitRepoId,
          },
        );
        return {
          organizationId: input.organizationId,
          gitRepoId: input.gitRepoId,
          deployedVersionsCount: 0,
          targetCount: 0,
        };
      }

      this.logger.info(
        `[${this.origin}] Deploying recipe versions to targets`,
        {
          recipeVersionCount: input.recipeVersionIds.length,
          gitRepoId: input.gitRepoId,
          affectedTargetPaths: input.affectedTargetPaths,
          targetIds: targetIdsToDeployTo,
        },
      );

      await this.deploymentPort.publishRecipes({
        organizationId: input.organizationId,
        userId: createUserId('system'), // System user for webhook-triggered deployments
        targetIds: targetIdsToDeployTo,
        recipeVersionIds: input.recipeVersionIds,
      });

      this.logger.info(
        `[${this.origin}] Successfully deployed recipe versions`,
        {
          recipeVersionCount: input.recipeVersionIds.length,
          targetCount: targetIdsToDeployTo.length,
          gitRepoId: input.gitRepoId,
        },
      );

      return {
        organizationId: input.organizationId,
        gitRepoId: input.gitRepoId,
        deployedVersionsCount: input.recipeVersionIds.length,
        targetCount: targetIdsToDeployTo.length,
      };
    } catch (deploymentError) {
      this.logger.error(`[${this.origin}] Failed to deploy recipe versions`, {
        recipeVersionCount: input.recipeVersionIds.length,
        gitRepoId: input.gitRepoId,
        error: getErrorMessage(deploymentError),
      });
      throw deploymentError;
    }
  }

  getJobName(input: DeployRecipesInput): string {
    return `deploy-recipes-${input.gitRepoId}-${Date.now()}`;
  }

  jobStartedInfo(input: DeployRecipesInput): string {
    return `repo: ${input.gitRepoId}, versions: ${input.recipeVersionIds.length}`;
  }

  getWorkerListener(): Partial<
    WorkerListeners<DeployRecipesInput, DeployRecipesOutput>
  > {
    return {
      completed: async (
        job: Job<DeployRecipesInput, DeployRecipesOutput, string>,
        result: DeployRecipesOutput,
      ) => {
        this.logger.info(
          `[${this.origin}] Job ${job.id} completed successfully`,
          {
            deployedVersionsCount: result.deployedVersionsCount,
            targetCount: result.targetCount,
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
