import { RecipeService } from '../../services/RecipeService';
import { RecipeVersionService } from '../../services/RecipeVersionService';
import { GitHexa } from '@packmind/git';
import { Recipe } from '../../../domain/entities/Recipe';
import { LogLevel, PackmindLogger, IDeploymentPort } from '@packmind/shared';
import { OrganizationId, createUserId } from '@packmind/accounts';
import { RecipeSummaryService } from '../../services/RecipeSummaryService';
import { RecipeVersionId } from '../../../domain/entities/RecipeVersion';

export interface CommonRepoData {
  owner: string;
  name: string;
}

export abstract class BaseUpdateRecipesFromWebhookUsecase {
  protected readonly logger: PackmindLogger;

  constructor(
    protected readonly recipeService: RecipeService,
    protected readonly recipeVersionService: RecipeVersionService,
    protected readonly gitHexa: GitHexa,
    protected readonly recipeSummaryService: RecipeSummaryService,
    origin: string,
    protected readonly deploymentPort?: IDeploymentPort,
    logLevel: LogLevel = LogLevel.INFO,
  ) {
    this.logger = new PackmindLogger(origin, logLevel);
    this.logger.info(`${origin} initialized`);
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
      await this.gitHexa.getOrganizationRepositories(organizationId);

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

    this.logger.debug('Handling webhook to get updated recipes');
    const updatedRecipes = await this.gitHexa.handleWebHook(
      matchingRepo,
      payload,
      /.packmind\/recipes\/.*\.md/,
    );

    this.logger.info(`Updated recipes retrieved from ${provider}`, {
      count: updatedRecipes.length,
    });

    if (updatedRecipes.length === 0) {
      this.logger.info('No recipes to update, returning empty array');
      return [];
    }

    const updatedRecipeEntities: Recipe[] = [];
    const newRecipeVersionIds: RecipeVersionId[] = [];
    const affectedTargetPaths = new Set<string>(); // Track unique target paths

    for (const updatedRecipe of updatedRecipes) {
      const { filePath, fileContent, ...gitCommit } = updatedRecipe;

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
      const existingRecipe = await this.recipeService.findRecipeBySlug(slug);

      if (existingRecipe) {
        this.logger.info('Recipe found, checking if deployed to target', {
          slug,
          recipeId: existingRecipe.id,
          targetPath,
        });

        // Check if recipe is deployed to this target in this repository
        // Only enforce deployment checking for non-root targets (when targetPath is not '/')
        let isDeployedToTarget = true; // Default to true for backward compatibility

        if (this.deploymentPort) {
          try {
            const deployments =
              await this.deploymentPort.listDeploymentsByRecipe({
                recipeId: existingRecipe.id,
                organizationId,
                userId: createUserId('system'), // System user for webhook operations
              });

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
            // Continue processing but assume not deployed to be safe for target-specific paths
            isDeployedToTarget = false;
          }
        } else {
          this.logger.warn(
            'Deployment port not available, allowing updates for backward compatibility',
          );
          isDeployedToTarget = false;
        }

        if (!isDeployedToTarget) {
          this.logger.info('Recipe not deployed to target, skipping update', {
            slug,
            targetPath,
            repoId: matchingRepo.id,
          });
          continue; // Skip to next recipe
        }

        this.logger.info(
          'Recipe is deployed to target, checking if content differs',
          {
            slug,
            recipeId: existingRecipe.id,
            targetPath,
          },
        );

        // Compare content to see if update is needed
        const contentHasChanged = existingRecipe.content !== fileContent;

        if (contentHasChanged) {
          this.logger.info('Content has changed, updating existing recipe', {
            slug,
            recipeId: existingRecipe.id,
          });

          // Business logic: Increment version number
          const nextVersion = existingRecipe.version + 1;
          this.logger.debug('Incrementing version number', {
            currentVersion: existingRecipe.version,
            nextVersion,
          });

          // Update the recipe entity
          const updatedRecipe = await this.recipeService.updateRecipe(
            existingRecipe.id,
            {
              name: existingRecipe.name,
              slug: existingRecipe.slug,
              content: fileContent,
              version: nextVersion,
              gitCommit,
              organizationId: existingRecipe.organizationId,
              userId: existingRecipe.userId,
            },
          );

          // Create new recipe version
          this.logger.debug('Creating new recipe version');

          // Generate summary for the recipe version
          let summary: string | null = null;
          try {
            this.logger.debug('Generating summary for recipe version update');
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
            this.logger.debug('Summary generated successfully for update', {
              summaryLength: summary.length,
            });
          } catch (summaryError) {
            this.logger.error(
              'Failed to generate summary during update, proceeding without summary',
              {
                error:
                  summaryError instanceof Error
                    ? summaryError.message
                    : String(summaryError),
              },
            );
          }

          const newRecipeVersion =
            await this.recipeVersionService.addRecipeVersion({
              recipeId: existingRecipe.id,
              name: existingRecipe.name,
              slug: existingRecipe.slug,
              content: fileContent,
              version: nextVersion,
              summary,
              gitCommit,
              userId: null, // Git commits don't have a specific user
            });

          updatedRecipeEntities.push(updatedRecipe);

          // Collect new recipe version for batch deployment
          if (newRecipeVersion) {
            newRecipeVersionIds.push(newRecipeVersion.id);
            // Track the target path this recipe was updated in
            affectedTargetPaths.add(targetPath);
          }

          this.logger.info('Recipe updated successfully', {
            slug,
            recipeId: existingRecipe.id,
            newVersion: nextVersion,
            targetPath,
          });
        } else {
          this.logger.info('Content is identical, skipping update', {
            slug,
            recipeId: existingRecipe.id,
          });
        }
      } else {
        this.logger.warn('Recipe not found in database, skipping update', {
          slug,
        });
      }
    }

    // Perform batch deployment for all new recipe versions
    if (this.deploymentPort && newRecipeVersionIds.length > 0) {
      try {
        // Get all targets for this repository to find the ones matching affected paths
        const allTargets = await this.deploymentPort.getTargetsByRepository({
          gitRepoId: matchingRepo.id,
          organizationId,
          userId: createUserId('system'),
        });

        // Filter targets to only those that match the affected target paths
        const targetIdsToDeployTo = allTargets
          .filter((target) => affectedTargetPaths.has(target.path))
          .map((target) => target.id);

        if (targetIdsToDeployTo.length > 0) {
          this.logger.info(
            'Automatically deploying new recipe versions to specific targets',
            {
              recipeVersionCount: newRecipeVersionIds.length,
              gitRepoId: matchingRepo.id,
              affectedTargetPaths: Array.from(affectedTargetPaths),
              targetIds: targetIdsToDeployTo,
            },
          );

          await this.deploymentPort.publishRecipes({
            organizationId: organizationId,
            userId: createUserId('system'), // System user for webhook-triggered deployments
            targetIds: targetIdsToDeployTo, // Use targetIds for target-specific deployment
            recipeVersionIds: newRecipeVersionIds,
          });

          this.logger.info(
            'Recipe versions deployed successfully to specific targets',
            {
              recipeVersionCount: newRecipeVersionIds.length,
              targetCount: targetIdsToDeployTo.length,
              gitRepoId: matchingRepo.id,
            },
          );
        } else {
          this.logger.warn(
            'No matching targets found for affected paths, skipping deployment',
            {
              affectedTargetPaths: Array.from(affectedTargetPaths),
              gitRepoId: matchingRepo.id,
            },
          );
        }
      } catch (deploymentError) {
        this.logger.error('Failed to deploy recipe versions automatically', {
          recipeVersionCount: newRecipeVersionIds.length,
          gitRepoId: matchingRepo.id,
          error:
            deploymentError instanceof Error
              ? deploymentError.message
              : String(deploymentError),
        });
        // Continue execution even if deployment fails
      }
    } else if (!this.deploymentPort) {
      this.logger.debug(
        'Deployment port not available, skipping automatic deployment',
      );
    }

    this.logger.info(
      `ProcessWebhookPayload process completed for ${provider}`,
      {
        updatedCount: updatedRecipeEntities.length,
        deployedVersions: newRecipeVersionIds.length,
      },
    );
    return updatedRecipeEntities;
  }
}
