import { PackmindLogger, LogLevel, WithTimestamps } from '@packmind/shared';
import { RecipesHexa } from '@packmind/recipes';
import { GitHexa } from '@packmind/git';
import { IRecipesDeploymentRepository } from '../../domain/repositories/IRecipesDeploymentRepository';
import {
  DeploymentOverview,
  GetDeploymentOverviewCommand,
  IGetDeploymentOverview,
  RecipeDeploymentStatus,
  RepositoryDeploymentStatus,
  Recipe,
  RecipeId,
  RecipeVersion,
  createRecipeVersionId,
  GitRepo,
  GitRepoId,
} from '@packmind/shared';
import assert from 'assert';

export class GetDeploymentOverviewUseCase implements IGetDeploymentOverview {
  constructor(
    private readonly deploymentsRepository: IRecipesDeploymentRepository,
    private readonly recipesHexa: RecipesHexa,
    private readonly gitHexa: GitHexa,
    private readonly logger: PackmindLogger = new PackmindLogger(
      'GetDeploymentOverviewUseCase',
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('GetDeploymentOverviewUseCase initialized');
  }

  async execute(
    command: GetDeploymentOverviewCommand,
  ): Promise<DeploymentOverview> {
    const { organizationId } = command;
    this.logger.info('Fetching deployment overview', { organizationId });

    try {
      // Fetch all required data
      const [deployments, recipes, gitRepos] = await Promise.all([
        this.deploymentsRepository.listByOrganizationId(organizationId),
        this.recipesHexa.listRecipesByOrganization(organizationId),
        this.gitHexa.getOrganizationRepositories(organizationId),
      ]);

      // Build a map of latest recipe versions per git repository
      const latestRecipeVersionsMap = new Map<
        GitRepoId,
        WithTimestamps<RecipeVersion>[]
      >();

      // Process deployments to extract latest recipe versions per repository
      for (const deployment of deployments) {
        for (const gitRepo of deployment.gitRepos) {
          const existingVersions =
            latestRecipeVersionsMap.get(gitRepo.id) || [];

          // Convert deployment recipe versions to WithTimestamps format
          const timestampedVersions = deployment.recipeVersions.map((rv) => ({
            ...rv,
            createdAt: new Date(deployment.createdAt),
            updatedAt: new Date(deployment.createdAt),
          }));

          // Merge and keep only the latest version of each recipe
          const mergedVersions = this.mergeLatestVersions(
            existingVersions,
            timestampedVersions,
          );
          latestRecipeVersionsMap.set(gitRepo.id, mergedVersions);
        }
      }

      this.logger.debug('Data fetched for deployment overview', {
        deploymentsCount: deployments.length,
        recipesCount: recipes.length,
        gitReposCount: gitRepos.length,
        latestVersionsMapSize: latestRecipeVersionsMap.size,
      });

      // Transform data for repository-centric view
      const repositories = await this.getRepositories(
        gitRepos,
        recipes,
        latestRecipeVersionsMap,
      );

      // Transform data for recipe-centric view
      const recipeDeployments = await this.getRecipesDeploymentStatus(
        gitRepos,
        recipes,
        latestRecipeVersionsMap,
      );

      // Log undeployed recipes
      const undeployedRecipes = recipeDeployments.filter(
        (r) => r.deployments.length === 0,
      );
      this.logger.debug('Undeployed recipes in result', {
        count: undeployedRecipes.length,
        undeployedRecipes: undeployedRecipes.map((r) => ({
          id: r.recipe.id,
          name: r.recipe.name,
          deploymentsCount: r.deployments.length,
        })),
      });

      this.logger.info('Deployment overview generated successfully', {
        repositoriesCount: repositories.length,
        recipesCount: recipeDeployments.length,
        undeployedRecipesCount: undeployedRecipes.length,
      });

      return {
        repositories,
        recipes: recipeDeployments,
      };
    } catch (error) {
      this.logger.error('Failed to fetch deployment overview', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private mergeLatestVersions(
    existing: WithTimestamps<RecipeVersion>[],
    newVersions: WithTimestamps<RecipeVersion>[],
  ): WithTimestamps<RecipeVersion>[] {
    const versionMap = new Map<RecipeId, WithTimestamps<RecipeVersion>>();

    // Add existing versions
    for (const version of existing) {
      const current = versionMap.get(version.recipeId);
      if (!current || version.version > current.version) {
        versionMap.set(version.recipeId, version);
      }
    }

    // Add/update with new versions
    for (const version of newVersions) {
      const current = versionMap.get(version.recipeId);
      if (!current || version.version > current.version) {
        versionMap.set(version.recipeId, version);
      }
    }

    return Array.from(versionMap.values());
  }

  private async getRepositories(
    gitRepos: GitRepo[],
    recipes: Recipe[],
    latestRecipeVersionsMap: Map<GitRepoId, WithTimestamps<RecipeVersion>[]>,
  ): Promise<RepositoryDeploymentStatus[]> {
    return gitRepos.map((gitRepo) => {
      const deployedRecipes = latestRecipeVersionsMap.get(gitRepo.id) || [];

      const deployedRecipeInfos = deployedRecipes
        .map((deployedVersion) => {
          const recipe = recipes.find((r) => r.id === deployedVersion.recipeId);
          if (!recipe) {
            this.logger.warn('Recipe not found for deployed version', {
              recipeId: deployedVersion.recipeId,
              gitRepoId: gitRepo.id,
            });
            return null;
          }

          // Find the latest version of this recipe
          const latestRecipeVersion = this.getLatestRecipe(recipe.id, recipes);

          // Convert the latest recipe to a RecipeVersion structure
          const latestVersion: RecipeVersion = {
            id: deployedVersion.id,
            recipeId: latestRecipeVersion.id,
            name: latestRecipeVersion.name,
            slug: latestRecipeVersion.slug,
            version: latestRecipeVersion.version,
            content: latestRecipeVersion.content,
            gitCommit: latestRecipeVersion.gitCommit,
            userId: latestRecipeVersion.userId,
          };

          const isUpToDate = deployedVersion.version >= latestVersion.version;

          return {
            recipe,
            deployedVersion,
            latestVersion,
            isUpToDate,
            deploymentDate: deployedVersion.createdAt.toISOString(),
          };
        })
        .filter((info): info is NonNullable<typeof info> => info !== null);

      const hasOutdatedRecipes = deployedRecipeInfos.some(
        (info) => !info.isUpToDate,
      );

      return {
        gitRepo,
        deployedRecipes: deployedRecipeInfos,
        hasOutdatedRecipes,
      };
    });
  }

  private async getRecipesDeploymentStatus(
    gitRepos: GitRepo[],
    recipes: Recipe[],
    latestRecipeVersionsMap: Map<GitRepoId, WithTimestamps<RecipeVersion>[]>,
  ): Promise<RecipeDeploymentStatus[]> {
    return recipes.map((recipe) => {
      const deployments = [];

      // Find the latest version of this recipe
      const latestRecipeVersion = this.getLatestRecipe(recipe.id, recipes);

      // Convert the latest recipe to a RecipeVersion structure
      const latestVersion: RecipeVersion = {
        id: createRecipeVersionId(latestRecipeVersion.id),
        recipeId: latestRecipeVersion.id,
        name: latestRecipeVersion.name,
        slug: latestRecipeVersion.slug,
        version: latestRecipeVersion.version,
        content: latestRecipeVersion.content,
        gitCommit: latestRecipeVersion.gitCommit,
        userId: latestRecipeVersion.userId,
      };

      // Find all repositories that have this recipe deployed
      for (const gitRepo of gitRepos) {
        const deployedVersions = latestRecipeVersionsMap.get(gitRepo.id) || [];
        const deployedVersion = deployedVersions.find(
          (v) => v.recipeId === recipe.id,
        );

        if (deployedVersion) {
          const isUpToDate = deployedVersion.version >= latestVersion.version;

          deployments.push({
            gitRepo,
            deployedVersion,
            isUpToDate,
            deploymentDate: deployedVersion.createdAt.toISOString(),
          });
        }
      }

      const hasOutdatedDeployments = deployments.some((d) => !d.isUpToDate);

      return {
        recipe,
        latestVersion,
        deployments,
        hasOutdatedDeployments,
      };
    });
  }

  private getLatestRecipe(recipeId: RecipeId, recipes: Recipe[]) {
    const latestRecipeVersion = recipes
      .filter((r) => r.id === recipeId)
      .reduce(
        (latest, current) => {
          if (latest === null) return current;
          return current.version > latest.version ? current : latest;
        },
        null as Recipe | null,
      );
    assert(latestRecipeVersion);
    return latestRecipeVersion;
  }
}
