import {
  IPublishRecipes,
  PublishRecipesCommand,
  IRecipesPort,
  GitRepoId,
  Target,
  RecipesDeployment,
  createRecipesDeploymentId,
  ICodingAgentPort,
  PrepareRecipesDeploymentCommand,
  IGitPort,
  OrganizationId,
  DistributionStatus,
} from '@packmind/types';
import { IRecipesDeploymentRepository } from '../../domain/repositories/IRecipesDeploymentRepository';
import { PackmindLogger } from '@packmind/logger';
import { Recipe, RecipeVersion, UserId } from '@packmind/types';
import { TargetService } from '../services/TargetService';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { v4 as uuidv4 } from 'uuid';

const origin = 'PublishRecipesUseCase';

export class PublishRecipesUseCase implements IPublishRecipes {
  constructor(
    private readonly recipesDeploymentRepository: IRecipesDeploymentRepository,
    private readonly gitPort: IGitPort,
    private readonly recipesPort: IRecipesPort,
    private readonly codingAgentPort: ICodingAgentPort,
    public readonly targetService: TargetService,
    public readonly renderModeConfigurationService: RenderModeConfigurationService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(command: PublishRecipesCommand): Promise<RecipesDeployment[]> {
    // Handle backward compatibility: if gitRepoIds is provided, convert to targets
    if (command.gitRepoIds && command.gitRepoIds.length > 0) {
      this.logger.info('Publishing recipes (legacy mode with gitRepoIds)', {
        gitRepoIdsCount: command.gitRepoIds.length,
        recipeVersionIdsCount: command.recipeVersionIds.length,
        organizationId: command.organizationId,
      });
      return this.executeWithRepositoryIds(command);
    }

    // New target-based approach
    if (!command.targetIds || command.targetIds.length === 0) {
      throw new Error('Either targetIds or gitRepoIds must be provided');
    }

    this.logger.info('Publishing recipes', {
      targetIdsCount: command.targetIds.length,
      recipeVersionIdsCount: command.recipeVersionIds.length,
      organizationId: command.organizationId,
    });

    // Fetch organization's active render modes for deployment tracking
    const activeRenderModes =
      await this.renderModeConfigurationService.getActiveRenderModes(
        command.organizationId as OrganizationId,
      );

    const codingAgents =
      this.renderModeConfigurationService.mapRenderModesToCodingAgents(
        activeRenderModes,
      );

    // Group targets by repository
    const repositoryTargetsMap = new Map();
    for (const targetId of command.targetIds) {
      const target = await this.targetService.findById(targetId);
      if (!target) {
        throw new Error(`Target with id ${targetId} not found`);
      }

      const repository = await this.gitPort.getRepositoryById(target.gitRepoId);
      if (!repository) {
        throw new Error(`Repository with id ${target.gitRepoId} not found`);
      }

      if (!repositoryTargetsMap.has(repository.id)) {
        repositoryTargetsMap.set(repository.id, {
          repository,
          targets: [],
        });
      }

      repositoryTargetsMap.get(repository.id).targets.push(target);

      this.logger.info('Target mapped to repository', {
        targetId,
        repositoryId: repository.id,
        owner: repository.owner,
        repo: repository.repo,
        targetName: target.name,
      });
    }

    // Fetch recipe versions by their IDs
    const recipeVersions = [];
    for (const recipeVersionId of command.recipeVersionIds) {
      const recipeVersion =
        await this.recipesPort.getRecipeVersionById(recipeVersionId);
      if (!recipeVersion) {
        throw new Error(`Recipe version with ID ${recipeVersionId} not found`);
      }
      recipeVersions.push(recipeVersion);
    }

    // Sort recipe versions alphabetically by name for deterministic ordering
    recipeVersions.sort((a, b) => a.name.localeCompare(b.name));

    const deployments: RecipesDeployment[] = [];

    // Process each repository (with all its targets)
    for (const [
      repositoryId,
      { repository: gitRepo, targets },
    ] of repositoryTargetsMap) {
      try {
        this.logger.info('Processing repository with targets', {
          repositoryId,
          gitRepoOwner: gitRepo.owner,
          gitRepoName: gitRepo.repo,
          targetsCount: targets.length,
          targetIds: targets.map((t: Target) => t.id),
        });

        // Get all unique previously deployed recipe versions across all targets in this repo
        const allPreviousRecipeVersions = new Map<string, RecipeVersion>();

        for (const target of targets) {
          const previousRecipeVersions =
            await this.recipesDeploymentRepository.findActiveRecipeVersionsByTarget(
              command.organizationId as OrganizationId,
              target.id,
            );

          // Merge into the overall map, keeping the latest version of each recipe
          for (const recipeVersion of previousRecipeVersions) {
            const existing = allPreviousRecipeVersions.get(
              recipeVersion.recipeId,
            );
            if (!existing || recipeVersion.version > existing.version) {
              allPreviousRecipeVersions.set(
                recipeVersion.recipeId,
                recipeVersion,
              );
            }
          }
        }

        const previousRecipeVersionsArray = Array.from(
          allPreviousRecipeVersions.values(),
        );

        this.logger.info('Found previous recipe versions across all targets', {
          count: previousRecipeVersionsArray.length,
        });

        // Get recipe versions from previous deployments and combine with new ones
        const allRecipeVersions = this.combineRecipeVersions(
          previousRecipeVersionsArray,
          recipeVersions,
        ).sort((a, b) => a.name.localeCompare(b.name));

        this.logger.info('Combined recipe versions', {
          totalCount: allRecipeVersions.length,
          newCount: recipeVersions.length,
          previousCount: previousRecipeVersionsArray.length,
        });

        // Prepare the deployment using CodingAgentHexa (includes all targets for this repo)
        const prepareCommand: PrepareRecipesDeploymentCommand = {
          userId: command.userId,
          organizationId: command.organizationId,
          recipeVersions: allRecipeVersions,
          gitRepo,
          targets: targets,
          codingAgents,
        };

        const fileUpdates =
          await this.codingAgentPort.prepareRecipesDeployment(prepareCommand);

        this.logger.info('Prepared file updates', {
          createOrUpdateCount: fileUpdates.createOrUpdate.length,
          deleteCount: fileUpdates.delete.length,
        });

        // Commit the changes to the git repository (once per repository)
        const commitMessage = `[PACKMIND] Update recipes files

- Updated ${recipeVersions.length} recipe(s)
- Total recipes in repository: ${allRecipeVersions.length}
- Targets: ${targets.map((t: Target) => t.name).join(', ')}

Recipes updated:
${recipeVersions.map((rv) => `- ${rv.name} (${rv.slug}) v${rv.version}`).join('\n')}`;

        let gitCommit;
        let deploymentStatus = DistributionStatus.success;
        try {
          gitCommit = await this.gitPort.commitToGit(
            gitRepo,
            fileUpdates.createOrUpdate,
            commitMessage,
          );
          this.logger.info('Committed changes', {
            commitId: gitCommit.id,
            commitSha: gitCommit.sha,
            targetsCount: targets.length,
          });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === 'NO_CHANGES_DETECTED'
          ) {
            this.logger.info(
              'No changes detected, creating no_changes deployment entries',
              {
                repositoryId,
                gitRepoId: gitRepo.id,
                recipeVersionsCount: allRecipeVersions.length,
                targetsCount: targets.length,
              },
            );
            // Set status to no_changes and continue without git commit
            deploymentStatus = DistributionStatus.no_changes;
            gitCommit = undefined;
          } else {
            throw error; // Re-throw other errors
          }
        }

        // Create individual deployment entry for each target (sharing the same git commit or no_changes status)
        for (const target of targets) {
          const deployment: RecipesDeployment = {
            id: createRecipesDeploymentId(uuidv4()),
            recipeVersions: recipeVersions, // Store only the intended recipe versions being deployed
            createdAt: new Date().toISOString(),
            authorId: command.userId as UserId,
            organizationId: command.organizationId as OrganizationId,
            // Single target model fields
            gitCommit: gitCommit, // Shared across all targets in this repo (undefined for no_changes)
            target: target, // Unique for each deployment
            status: deploymentStatus,
            renderModes: activeRenderModes,
          };

          // Save the deployment to the database
          await this.recipesDeploymentRepository.add(deployment);

          this.logger.info('Created deployment for target', {
            deploymentId: deployment.id,
            targetId: target.id,
            targetName: target.name,
            intentedRecipeVersionsCount: deployment.recipeVersions.length,
            status: deploymentStatus,
            commitSha: gitCommit?.sha,
          });

          deployments.push(deployment);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to publish recipes to repository', {
          repositoryId,
          gitRepoId: gitRepo.id,
          error: errorMessage,
          targetsCount: targets.length,
        });

        // Create failure deployment for each target in this repository
        for (const target of targets) {
          await this.saveRecipeDeploymentInFailure(
            command,
            target,
            deployments,
            gitRepo.id,
            errorMessage,
          );
        }
      }
    }

    this.logger.info('Successfully published recipes', {
      deploymentsCount: deployments.length,
      repositoriesProcessed: repositoryTargetsMap.size,
      successfulDeployments: deployments.filter(
        (d) => d.status === DistributionStatus.success,
      ).length,
      failedDeployments: deployments.filter(
        (d) => d.status === DistributionStatus.failure,
      ).length,
      noChangesDeployments: deployments.filter(
        (d) => d.status === DistributionStatus.no_changes,
      ).length,
    });

    return deployments;
  }

  public async saveRecipeDeploymentInFailure(
    command: PublishRecipesCommand,
    target: Target,
    deployments: RecipesDeployment[],
    gitRepoId: GitRepoId,
    error: string,
  ) {
    // Create failure deployment record
    try {
      // Fetch organization's active render modes for deployment tracking
      const activeRenderModes =
        await this.renderModeConfigurationService.getActiveRenderModes(
          command.organizationId as OrganizationId,
        );

      // Get the recipe versions that were being deployed (for proper association)
      const recipeVersions = [];
      for (const recipeVersionId of command.recipeVersionIds) {
        const recipeVersion =
          await this.recipesPort.getRecipeVersionById(recipeVersionId);
        if (recipeVersion) {
          recipeVersions.push(recipeVersion);
        } else {
          this.logger.warn('Recipe version not found for failure record', {
            recipeVersionId,
          });
        }
      }

      // Sort recipe versions alphabetically for consistency
      recipeVersions.sort((a, b) => a.name.localeCompare(b.name));

      const failureDeployment: RecipesDeployment = {
        id: createRecipesDeploymentId(uuidv4()),
        recipeVersions: recipeVersions, // Include recipe versions for proper association
        createdAt: new Date().toISOString(),
        authorId: command.userId as UserId,
        organizationId: command.organizationId as OrganizationId,
        // Single target model fields for failure
        gitCommit: undefined, // No commit created on failure
        target,
        status: DistributionStatus.failure,
        error,
        renderModes: activeRenderModes,
      };

      await this.recipesDeploymentRepository.add(failureDeployment);

      // Add failure deployment to array for return
      deployments.push(failureDeployment);

      this.logger.info('Created failure deployment record', {
        deploymentId: failureDeployment.id,
        gitRepoId: gitRepoId,
        targetId: target.id,
        status: DistributionStatus.failure,
        error: error,
      });
    } catch (saveError) {
      this.logger.error('Failed to save failure deployment record', {
        gitRepoId: gitRepoId,
        targetId: target.id,
        saveError:
          saveError instanceof Error ? saveError.message : String(saveError),
      });
    }
  }

  public collectUniqueRecipeVersions(
    deployments: RecipesDeployment[],
  ): RecipeVersion[] {
    const recipeVersionMap = new Map<string, RecipeVersion>();

    for (const deployment of deployments) {
      for (const recipeVersion of deployment.recipeVersions) {
        const key = recipeVersion.recipeId;
        // Keep the latest version for each recipe (by deployment creation date as approximation)
        if (!recipeVersionMap.has(key)) {
          recipeVersionMap.set(key, recipeVersion as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        }
      }
    }

    return Array.from(recipeVersionMap.values());
  }

  public combineRecipeVersions(
    previousRecipeVersions: RecipeVersion[],
    newRecipeVersions: RecipeVersion[],
  ): RecipeVersion[] {
    const recipeVersionsMap = new Map<string, RecipeVersion>();

    // Add previous versions first
    previousRecipeVersions.forEach((rv) => {
      recipeVersionsMap.set(rv.recipeId, rv);
    });

    // Override with current deployment versions (these are newer)
    newRecipeVersions.forEach((rv) => {
      recipeVersionsMap.set(rv.recipeId, rv);
    });

    return Array.from(recipeVersionsMap.values());
  }

  public combineRecipes(
    previousRecipes: Recipe[],
    newRecipes: Recipe[],
  ): Recipe[] {
    const recipeMap = new Map<string, Recipe>();

    // Add previous recipes
    for (const recipe of previousRecipes) {
      recipeMap.set(recipe.id, recipe);
    }

    // Add/override with new recipes
    for (const recipe of newRecipes) {
      recipeMap.set(recipe.id, recipe);
    }

    return Array.from(recipeMap.values());
  }

  /**
   * Legacy method for backward compatibility with gitRepoIds
   * @deprecated Use execute() with targetIds instead
   */
  public async executeWithRepositoryIds(
    command: PublishRecipesCommand,
  ): Promise<RecipesDeployment[]> {
    if (!command.gitRepoIds || command.gitRepoIds.length === 0) {
      throw new Error('gitRepoIds must be provided for legacy mode');
    }

    // Fetch organization's active render modes for deployment tracking
    const activeRenderModes =
      await this.renderModeConfigurationService.getActiveRenderModes(
        command.organizationId as OrganizationId,
      );

    // Get targets for each repository and log targetIds
    const repositoryTargetsMap = new Map();
    for (const gitRepoId of command.gitRepoIds) {
      const targets = await this.targetService.getTargetsByGitRepoId(gitRepoId);
      if (targets.length > 0) {
        repositoryTargetsMap.set(gitRepoId, targets);
        this.logger.info('Targets found for repository', {
          gitRepoId,
          targetsCount: targets.length,
          targetIds: targets.map((t) => t.id),
        });
      } else {
        this.logger.info('No targets found for repository', {
          gitRepoId,
        });
      }
    }

    // Fetch git repositories by their IDs
    const gitRepos = [];
    for (const gitRepoId of command.gitRepoIds) {
      const gitRepo = await this.gitPort.getRepositoryById(gitRepoId);
      if (!gitRepo) {
        throw new Error(`Git repository with ID ${gitRepoId} not found`);
      }
      gitRepos.push(gitRepo);
    }

    // Fetch recipe versions by their IDs
    const recipeVersions = [];
    for (const recipeVersionId of command.recipeVersionIds) {
      const recipeVersion =
        await this.recipesPort.getRecipeVersionById(recipeVersionId);
      if (!recipeVersion) {
        throw new Error(`Recipe version with ID ${recipeVersionId} not found`);
      }
      recipeVersions.push(recipeVersion);
    }

    // Sort recipe versions alphabetically by name for deterministic ordering
    recipeVersions.sort((a, b) => a.name.localeCompare(b.name));

    const deployments: RecipesDeployment[] = [];

    const codingAgents =
      this.renderModeConfigurationService.mapRenderModesToCodingAgents(
        activeRenderModes,
      );

    for (const gitRepo of gitRepos) {
      const targets = repositoryTargetsMap.get(gitRepo.id) || [];
      try {
        this.logger.info('Processing git repository (legacy mode)', {
          gitRepoId: gitRepo.id,
          gitRepoOwner: gitRepo.owner,
          gitRepoName: gitRepo.repo,
        });

        // Find previously deployed recipes for this repo
        const previousDeployments =
          await this.recipesDeploymentRepository.listByOrganizationIdAndGitRepos(
            command.organizationId as OrganizationId,
            [gitRepo.id],
          );

        this.logger.info('Found previous deployments', {
          count: previousDeployments.length,
        });

        // Collect all previously deployed recipe versions
        const previousRecipeVersions =
          this.collectUniqueRecipeVersions(previousDeployments);

        this.logger.info('Collected previous recipe versions', {
          count: previousRecipeVersions.length,
        });

        // Get recipe versions from previous deployments and combine with new ones
        const allRecipeVersions = this.combineRecipeVersions(
          previousRecipeVersions,
          recipeVersions,
        ).sort((a, b) => a.name.localeCompare(b.name));

        this.logger.info('Combined recipe versions', {
          totalCount: allRecipeVersions.length,
          newCount: recipeVersions.length,
          previousCount: previousRecipeVersions.length,
        });

        // Prepare the deployment using CodingAgentHexa
        const prepareCommand: PrepareRecipesDeploymentCommand = {
          userId: command.userId,
          organizationId: command.organizationId,
          recipeVersions: allRecipeVersions,
          gitRepo,
          targets,
          codingAgents,
        };

        const fileUpdates =
          await this.codingAgentPort.prepareRecipesDeployment(prepareCommand);

        this.logger.info('Prepared file updates', {
          createOrUpdateCount: fileUpdates.createOrUpdate.length,
          deleteCount: fileUpdates.delete.length,
        });

        // Commit the changes to the git repository
        const commitMessage = `[PACKMIND] Update recipes files

- Updated ${recipeVersions.length} recipe(s)
- Total recipes in repository: ${allRecipeVersions.length}

Recipes updated:
${recipeVersions.map((rv) => `- ${rv.name} (${rv.slug}) v${rv.version}`).join('\n')}`;

        let gitCommit;
        try {
          gitCommit = await this.gitPort.commitToGit(
            gitRepo,
            fileUpdates.createOrUpdate,
            commitMessage,
          );
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === 'NO_CHANGES_DETECTED'
          ) {
            this.logger.info(
              'No changes detected, skipping deployment creation',
              {
                gitRepoId: gitRepo.id,
                recipeVersionsCount: allRecipeVersions.length,
              },
            );
            continue; // Skip to next repository
          }
          throw error; // Re-throw other errors
        }

        this.logger.info('Committed changes', {
          commitId: gitCommit.id,
          commitSha: gitCommit.sha,
        });

        // Use the first target for legacy mode (backward compatibility)
        const defaultTarget = targets.length > 0 ? targets[0] : null;
        if (!defaultTarget) {
          throw new Error(`No targets found for repository ${gitRepo.id}`);
        }

        // Create new deployment entry
        const deployment: RecipesDeployment = {
          id: createRecipesDeploymentId(uuidv4()),
          recipeVersions: recipeVersions, // Store only the intended recipe versions being deployed
          gitCommit: gitCommit,
          target: defaultTarget,
          status: DistributionStatus.success,
          createdAt: new Date().toISOString(),
          authorId: command.userId as UserId,
          organizationId: command.organizationId as OrganizationId,
          renderModes: activeRenderModes,
        };

        // Save the deployment to the database
        await this.recipesDeploymentRepository.add(deployment);

        this.logger.info('Created deployment', {
          deploymentId: deployment.id,
          intentedRecipeVersionsCount: deployment.recipeVersions.length,
        });

        deployments.push(deployment);
      } catch (error) {
        this.logger.error('Failed to publish recipes to repository', {
          gitRepoId: gitRepo.id,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }

    this.logger.info('Successfully published recipes (legacy mode)', {
      deploymentsCount: deployments.length,
    });

    return deployments;
  }
}
