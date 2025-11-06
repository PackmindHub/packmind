import { RecipeService } from '../../services/RecipeService';
import { IGitPort } from '@packmind/types';
import { GitHexa } from '@packmind/git';
import { Recipe } from '../../../domain/entities/Recipe';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { IDeploymentPort } from '@packmind/types';
import { OrganizationId, createUserId } from '@packmind/accounts';
import { IRecipesDelayedJobs } from '../../../domain/jobs/IRecipesDelayedJobs';

export interface CommonRepoData {
  owner: string;
  name: string;
}

export abstract class BaseUpdateRecipesFromWebhookUsecase {
  protected readonly logger: PackmindLogger;
  protected recipesDelayedJobs: IRecipesDelayedJobs | null = null;

  constructor(
    protected readonly recipeService: RecipeService,
    protected readonly gitPort: IGitPort,
    origin: string,
    protected readonly deploymentPort?: IDeploymentPort,
    logLevel: LogLevel = LogLevel.INFO,
    protected readonly gitHexa?: GitHexa, // Keep for addFetchFileContentJob() - not in port
  ) {
    this.logger = new PackmindLogger(origin, logLevel);
    this.logger.info(`${origin} initialized`);
  }

  /**
   * Set the recipes delayed jobs reference after initialization to avoid circular dependencies
   */
  public setRecipesDelayedJobs(recipesDelayedJobs: IRecipesDelayedJobs): void {
    this.recipesDelayedJobs = recipesDelayedJobs;
  }

  /**
   * Extract repository information from provider-specific webhook payload
   */
  protected abstract extractRepoInfo(payload: unknown): CommonRepoData | null;

  /**
   * Get the provider name for logging purposes
   */
  protected abstract getProviderName(): string;

  /**
   * Check if the webhook event is a push event
   */
  protected abstract isPushEvent(headers: Record<string, string>): boolean;

  /**
   * Common webhook processing logic
   * Returns list of recipes that match the webhook and are deployed to the repository
   * Actual updates happen asynchronously via delayed jobs
   */
  protected async processWebhookPayload(
    repoData: CommonRepoData,
    organizationId: OrganizationId,
    provider: string,
    payload: unknown,
  ): Promise<Recipe[]> {
    this.logger.debug('Getting organization repositories', {
      organizationId,
    });
    const organizationRepos =
      await this.gitPort.getOrganizationRepositories(organizationId);

    if (organizationRepos.length === 0) {
      this.logger.warn('No repositories found for organization', {
        organizationId,
      });
      return [];
    }

    // Log all configured repositories for debugging
    this.logger.debug('Configured repositories in organization', {
      organizationId,
      repositories: organizationRepos.map((repo) => ({
        id: repo.id,
        owner: repo.owner,
        repo: repo.repo,
        providerId: repo.providerId,
      })),
    });

    // Find matching GitRepo from organization repositories
    const matchingRepo = organizationRepos.find(
      (repo) => repo.owner === repoData.owner && repo.repo === repoData.name,
    );

    if (!matchingRepo) {
      this.logger.warn('No matching repository found in organization', {
        organizationId,
        repoOwner: repoData.owner,
        repoName: repoData.name,
        availableRepos: organizationRepos.map(
          (repo) => `${repo.owner}/${repo.repo}`,
        ),
      });
      return [];
    }

    this.logger.debug('Found matching repository', {
      repoId: matchingRepo.id,
      owner: matchingRepo.owner,
      repo: matchingRepo.repo,
    });

    // Use handleWebHookWithoutContent to get list of changed files
    this.logger.debug('Handling webhook to get list of changed recipe files');
    const recipesPaths = await this.gitPort.handleWebHookWithoutContent({
      organizationId,
      gitRepoId: matchingRepo.id,
      payload,
      fileMatcher: /.packmind\/recipes\/.*\.md/,
    });

    this.logger.info(`Recipe paths retrieved from ${provider}`, {
      count: recipesPaths.length,
    });

    if (recipesPaths.length === 0) {
      this.logger.info('No recipe paths to process, returning empty array');
      return [];
    }

    // Filter recipes by deployment status and collect matching recipes
    const matchingRecipes: Recipe[] = [];
    const recipeDeploymentInfo: Record<
      string,
      { targetPath: string; isDeployedToTarget: boolean }
    > = {};

    for (const recipePath of recipesPaths) {
      const { filePath } = recipePath;

      this.logger.debug('Processing recipe file', { filePath });

      const [targetPath, slug] =
        `${filePath.startsWith('/') ? '' : '/'}${filePath}`
          .replace(/\.md$/, '')
          .split('.packmind/recipes/');

      this.logger.debug('Extracted target path and slug from filepath', {
        targetPath,
        slug,
        filePath,
      });

      // Check if recipe exists in database
      this.logger.debug('Checking if recipe exists in database', { slug });
      const existingRecipe = await this.recipeService.findRecipeBySlug(
        slug,
        organizationId,
      );

      if (!existingRecipe) {
        this.logger.warn('Recipe not found in database, skipping', {
          slug,
          organizationId,
        });
        continue;
      }

      this.logger.info('Recipe found, checking if deployed to target', {
        slug,
        recipeId: existingRecipe.id,
        targetPath,
      });

      // Check if recipe is deployed to this target in this repository
      let isDeployedToTarget = true; // Default to true for backward compatibility

      if (this.deploymentPort) {
        try {
          const deployments = await this.deploymentPort.listDeploymentsByRecipe(
            {
              recipeId: existingRecipe.id,
              organizationId,
              userId: createUserId('system'), // System user for webhook operations
            },
          );

          // Check if any deployment includes this target path and this repository
          isDeployedToTarget = deployments.some(
            (deployment) =>
              deployment.target?.gitRepoId === matchingRepo.id &&
              deployment.target?.path === targetPath,
          );

          this.logger.debug('Target-specific deployment check result', {
            slug,
            targetPath,
            isDeployedToTarget,
            deploymentsFound: deployments.length,
          });
        } catch (deploymentError) {
          this.logger.error('Failed to check recipe deployment status', {
            slug,
            targetPath,
            error:
              deploymentError instanceof Error
                ? deploymentError.message
                : String(deploymentError),
          });
          // Continue processing but assume not deployed to be safe
          isDeployedToTarget = false;
        }
      } else {
        this.logger.warn(
          'Deployment port not available, allowing updates for backward compatibility',
        );
        isDeployedToTarget = false;
      }

      // Store deployment info for later job processing
      recipeDeploymentInfo[slug] = { targetPath, isDeployedToTarget };

      if (isDeployedToTarget) {
        this.logger.info('Recipe is deployed to target, adding to match list', {
          slug,
          recipeId: existingRecipe.id,
          targetPath,
        });
        matchingRecipes.push(existingRecipe);
      } else {
        this.logger.info('Recipe not deployed to target, skipping', {
          slug,
          targetPath,
          repoId: matchingRepo.id,
        });
      }
    }

    // If no matching recipes, return empty array
    if (matchingRecipes.length === 0) {
      this.logger.info(
        'No matching deployed recipes found, returning empty array',
      );
      return [];
    }

    this.logger.info(`Found ${matchingRecipes.length} deployed recipes`, {
      count: matchingRecipes.length,
    });

    // Queue FetchFileContent job to fetch file content from git
    this.logger.debug('Queueing FetchFileContent job', {
      organizationId,
      gitRepoId: matchingRepo.id,
      filesCount: recipesPaths.length,
    });

    try {
      if (!this.gitHexa) {
        throw new Error(
          'GitHexa not available - cannot add fetch file content job',
        );
      }
      await this.gitHexa.addFetchFileContentJob(
        {
          organizationId,
          gitRepoId: matchingRepo.id,
          files: recipesPaths,
        },
        async (fetchResult) => {
          this.logger.info(
            `FetchFileContent job completed, queueing UpdateRecipesAndGenerateSummaries job`,
            {
              filesWithContent: fetchResult.files.length,
            },
          );

          // Queue UpdateRecipesAndGenerateSummaries job with the fetched content
          if (!this.recipesDelayedJobs) {
            this.logger.error(
              'Recipes delayed jobs not set, cannot queue update job',
            );
            return;
          }

          await this.recipesDelayedJobs.updateRecipesAndGenerateSummariesDelayedJob.addJobWithCallback(
            {
              organizationId,
              gitRepoId: matchingRepo.id,
              files: fetchResult.files,
              recipeDeploymentInfo,
            },
            async (updateResult) => {
              this.logger.info(
                `UpdateRecipesAndGenerateSummaries job completed, queueing DeployRecipes job`,
                {
                  updatedRecipesCount: updateResult.recipeVersionIds.length,
                },
              );

              // Queue DeployRecipes job to deploy the updated recipes
              if (!this.recipesDelayedJobs) {
                this.logger.error(
                  'Recipes delayed jobs not set, cannot queue deploy job',
                );
                return;
              }
              await this.recipesDelayedJobs.deployRecipesDelayedJob.addJobWithCallback(
                {
                  organizationId: updateResult.organizationId,
                  gitRepoId: updateResult.gitRepoId,
                  recipeVersionIds: updateResult.recipeVersionIds,
                  affectedTargetPaths: updateResult.affectedTargetPaths,
                },
                async (deployResult: {
                  deployedVersionsCount: number;
                  targetCount: number;
                }) => {
                  this.logger.info(`DeployRecipes job completed successfully`, {
                    deployedVersionsCount: deployResult.deployedVersionsCount,
                    targetCount: deployResult.targetCount,
                  });
                },
              );
            },
          );
        },
      );

      this.logger.info(
        `FetchFileContent job queued successfully for ${provider}`,
        {
          matchingRecipesCount: matchingRecipes.length,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue FetchFileContent job for ${provider}`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      throw error;
    }

    this.logger.info(
      `ProcessWebhookPayload completed for ${provider}, jobs queued`,
      {
        matchingRecipesCount: matchingRecipes.length,
      },
    );

    // Return the list of matching recipes (in their current state, before updates)
    return matchingRecipes;
  }
}
