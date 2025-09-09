import { IPublishRecipes, PublishRecipesCommand } from '@packmind/shared';
import {
  RecipesDeployment,
  createRecipesDeploymentId,
} from '../../domain/entities/RecipesDeployment';
import { IRecipesDeploymentRepository } from '../../domain/repositories/IRecipesDeploymentRepository';
import {
  CodingAgentHexa,
  PrepareRecipesDeploymentCommand,
  CodingAgents,
} from '@packmind/coding-agent';
import { GitHexa } from '@packmind/git';
import { RecipesHexa } from '@packmind/recipes';
import { OrganizationId, Recipe, RecipeVersion } from '@packmind/shared';
import { PackmindLogger, UserId } from '@packmind/shared';

// import { GitRepo } from '@packmind/git';
import { v4 as uuidv4 } from 'uuid';

export class PublishRecipesUseCase implements IPublishRecipes {
  private readonly logger: PackmindLogger;

  constructor(
    private readonly recipesDeploymentRepository: IRecipesDeploymentRepository,
    private readonly gitHexa: GitHexa,
    private readonly recipesHexa: RecipesHexa,
    private readonly codingAgentHexa: CodingAgentHexa,
  ) {
    this.logger = new PackmindLogger('PublishRecipesUseCase');
  }

  async execute(command: PublishRecipesCommand): Promise<RecipesDeployment[]> {
    this.logger.info('Publishing recipes', {
      gitRepoIdsCount: command.gitRepoIds.length,
      recipeVersionIdsCount: command.recipeVersionIds.length,
      organizationId: command.organizationId,
    });

    // Fetch git repositories by their IDs
    const gitRepos = [];
    for (const gitRepoId of command.gitRepoIds) {
      const gitRepo = await this.gitHexa.getRepositoryById(gitRepoId);
      if (!gitRepo) {
        throw new Error(`Git repository with ID ${gitRepoId} not found`);
      }
      gitRepos.push(gitRepo);
    }

    // Fetch recipe versions by their IDs
    const recipeVersions = [];
    for (const recipeVersionId of command.recipeVersionIds) {
      const recipeVersion =
        await this.recipesHexa.getRecipeVersionById(recipeVersionId);
      if (!recipeVersion) {
        throw new Error(`Recipe version with ID ${recipeVersionId} not found`);
      }
      recipeVersions.push(recipeVersion);
    }

    const deployments: RecipesDeployment[] = [];

    for (const gitRepo of gitRepos) {
      try {
        this.logger.info('Processing git repository', {
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
        );

        this.logger.info('Combined recipe versions', {
          totalCount: allRecipeVersions.length,
          newCount: recipeVersions.length,
          previousCount: previousRecipeVersions.length,
        });

        // Prepare the deployment using CodingAgentHexa
        const prepareCommand: PrepareRecipesDeploymentCommand = {
          recipeVersions: allRecipeVersions,
          gitRepo,
          codingAgents: [
            CodingAgents.packmind,
            CodingAgents.junie,
            CodingAgents.claude,
            CodingAgents.cursor,
            CodingAgents.copilot,
            CodingAgents.agents_md,
          ], // Deploy to Packmind, Junie, Claude Code, Cursor, GitHub Copilot, and AGENTS.md
        };

        const fileUpdates =
          await this.codingAgentHexa.prepareRecipesDeployment(prepareCommand);

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
          gitCommit = await this.gitHexa.commitToGit(
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

        // Create new deployment entry
        const deployment: RecipesDeployment = {
          id: createRecipesDeploymentId(uuidv4()),
          recipeVersions: allRecipeVersions,
          gitRepos: [gitRepo],
          gitCommits: [gitCommit],
          createdAt: new Date().toISOString(),
          authorId: command.userId as UserId,
          organizationId: command.organizationId as OrganizationId,
        };

        // Save the deployment to the database
        await this.recipesDeploymentRepository.add(deployment);

        this.logger.info('Created deployment', {
          deploymentId: deployment.id,
          recipeVersionsCount: deployment.recipeVersions.length,
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

    this.logger.info('Successfully published recipes', {
      deploymentsCount: deployments.length,
    });

    return deployments;
  }

  private collectUniqueRecipeVersions(
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

  private combineRecipeVersions(
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

  private combineRecipes(
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
}
