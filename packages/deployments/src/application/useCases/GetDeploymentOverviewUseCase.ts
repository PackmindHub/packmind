import {
  PackmindLogger,
  LogLevel,
  WithTimestamps,
  IRecipesPort,
} from '@packmind/shared';
import { GitHexa } from '@packmind/git';
import { IRecipesDeploymentRepository } from '../../domain/repositories/IRecipesDeploymentRepository';
import {
  DeploymentOverview,
  GetDeploymentOverviewCommand,
  IGetDeploymentOverview,
  RecipeDeploymentStatus,
  RepositoryDeploymentStatus,
  TargetDeploymentStatus,
  TargetDeploymentInfo,
  DeployedRecipeTargetInfo,
  Recipe,
  RecipeId,
  RecipeVersion,
  RecipesDeployment,
  createRecipeVersionId,
  GitRepo,
  GitRepoId,
  DistributionStatus,
  TargetWithRepository,
} from '@packmind/shared';
import assert from 'assert';
import { GetTargetsByOrganizationUseCase } from './GetTargetsByOrganizationUseCase';

export class GetDeploymentOverviewUseCase implements IGetDeploymentOverview {
  constructor(
    private readonly deploymentsRepository: IRecipesDeploymentRepository,
    private readonly recipesPort: IRecipesPort,
    private readonly gitHexa: GitHexa,
    private readonly getTargetsByOrganizationUseCase: GetTargetsByOrganizationUseCase,
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
      // Fetch all required data - only successful deployments for overview
      const [deployments, recipes, gitRepos] = await Promise.all([
        this.deploymentsRepository.listByOrganizationIdWithStatus(
          organizationId,
          DistributionStatus.success,
        ),
        this.recipesPort.listRecipesByOrganization(organizationId),
        this.gitHexa.getOrganizationRepositories(organizationId),
      ]);

      // Build a map of latest recipe versions per target (target-centric approach)
      const latestRecipeVersionsMap = new Map<
        GitRepoId,
        WithTimestamps<RecipeVersion>[]
      >();

      // Process deployments to extract latest recipe versions per target's repository
      for (const deployment of deployments) {
        // Handle both old array-based and new single-reference models
        const targets = deployment.target ? [deployment.target] : [];

        for (const target of targets) {
          const gitRepoId = target.gitRepoId;
          const existingVersions = latestRecipeVersionsMap.get(gitRepoId) || [];

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
          latestRecipeVersionsMap.set(gitRepoId, mergedVersions);
        }
      }

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
        deployments,
      );

      // Get all targets for the organization (including those with no deployments)
      const allTargetsWithRepository =
        await this.getTargetsByOrganizationUseCase.execute({
          organizationId,
          userId: command.userId,
        });

      // Transform data for target-centric view
      const targets = await this.getTargetDeploymentStatus(
        deployments,
        gitRepos,
        recipes,
        allTargetsWithRepository,
      );

      // Log undeployed recipes
      const undeployedRecipes = recipeDeployments.filter(
        (r) => r.deployments.length === 0,
      );

      this.logger.info('Deployment overview generated successfully', {
        repositoriesCount: repositories.length,
        targetsCount: targets.length,
        recipesCount: recipeDeployments.length,
        undeployedRecipesCount: undeployedRecipes.length,
      });

      return {
        repositories,
        targets,
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
    allDeployments: RecipesDeployment[],
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

      // Build target-based deployments for this recipe
      const targetDeployments = this.buildTargetDeploymentsForRecipe(
        recipe,
        allDeployments,
        gitRepos,
      );

      return {
        recipe,
        latestVersion,
        deployments,
        targetDeployments,
        hasOutdatedDeployments,
      };
    });
  }

  public buildTargetDeploymentsForRecipe(
    recipe: Recipe,
    allDeployments: RecipesDeployment[],
    gitRepos: GitRepo[],
  ): TargetDeploymentInfo[] {
    // Filter deployments for this specific recipe
    const recipeDeployments = allDeployments.filter((deployment) =>
      deployment.recipeVersions.some((rv) => rv.recipeId === recipe.id),
    );

    // Group by target
    const targetDeploymentMap = new Map<string, RecipesDeployment[]>();

    for (const deployment of recipeDeployments) {
      if (deployment.target) {
        const targetId = deployment.target.id;
        if (!targetDeploymentMap.has(targetId)) {
          targetDeploymentMap.set(targetId, []);
        }
        const targetDeployments = targetDeploymentMap.get(targetId);
        if (targetDeployments) {
          targetDeployments.push(deployment);
        }
      }
    }

    const targetDeployments: TargetDeploymentInfo[] = [];

    for (const [, deployments] of targetDeploymentMap.entries()) {
      const target = deployments[0]?.target;
      if (!target) continue;
      const gitRepo = gitRepos.find((repo) => repo.id === target.gitRepoId);

      if (!gitRepo) continue;

      // Find the latest deployed version for this recipe on this target
      let latestDeployedVersion: RecipeVersion | null = null;
      let latestDeploymentDate = '';

      for (const deployment of deployments) {
        for (const recipeVersion of deployment.recipeVersions) {
          if (recipeVersion.recipeId === recipe.id) {
            if (
              !latestDeployedVersion ||
              recipeVersion.version > latestDeployedVersion.version
            ) {
              latestDeployedVersion = recipeVersion;
              latestDeploymentDate = deployment.createdAt;
            }
          }
        }
      }

      if (latestDeployedVersion) {
        const latestVersion: RecipeVersion = {
          id: createRecipeVersionId(recipe.id),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          version: recipe.version,
          content: recipe.content,
          gitCommit: recipe.gitCommit,
          userId: recipe.userId,
        };

        targetDeployments.push({
          target,
          gitRepo,
          deployedVersion: latestDeployedVersion,
          isUpToDate: latestDeployedVersion.version >= latestVersion.version,
          deploymentDate: latestDeploymentDate,
        });
      }
    }

    return targetDeployments;
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

  public async getTargetDeploymentStatus(
    deployments: RecipesDeployment[],
    gitRepos: GitRepo[],
    recipes: Recipe[],
    allTargetsWithRepository?: TargetWithRepository[], // All targets including those with no deployments
  ): Promise<TargetDeploymentStatus[]> {
    // Group deployments by target
    const targetMap = new Map<string, RecipesDeployment[]>();

    for (const deployment of deployments) {
      if (deployment.target) {
        const targetId = deployment.target.id;
        if (!targetMap.has(targetId)) {
          targetMap.set(targetId, []);
        }
        const targetDeployments = targetMap.get(targetId);
        if (targetDeployments) {
          targetDeployments.push(deployment);
        }
      }
    }

    // Build target deployment status for each target (both with and without deployments)
    const targetStatuses: TargetDeploymentStatus[] = [];

    // If we have allTargetsWithRepository, include all targets (even those without deployments)
    const targetsToProcess = allTargetsWithRepository || [];

    // Add targets from deployments that might not be in allTargetsWithRepository (fallback)
    if (!allTargetsWithRepository) {
      for (const [, targetDeployments] of targetMap.entries()) {
        const target = targetDeployments[0]?.target;
        if (target) {
          const gitRepo = gitRepos.find((repo) => repo.id === target.gitRepoId);
          if (gitRepo) {
            targetsToProcess.push({
              ...target,
              repository: {
                owner: gitRepo.owner,
                repo: gitRepo.repo,
                branch: gitRepo.branch,
              },
            });
          }
        }
      }
    }

    for (const targetWithRepo of targetsToProcess) {
      const target = targetWithRepo;
      const gitRepo = gitRepos.find((repo) => repo.id === target.gitRepoId);

      if (!gitRepo) continue;

      const targetDeployments = targetMap.get(target.id) || []; // Empty array for targets with no deployments

      // Get deployed recipes for this target
      const deployedRecipes: DeployedRecipeTargetInfo[] = [];
      let hasOutdatedRecipes = false;

      // Process each recipe deployed to this target
      const recipeVersionsMap = new Map<
        RecipeId,
        RecipeVersion & { deploymentDate: string }
      >();

      for (const deployment of targetDeployments) {
        // All deployments are successful since we filtered at query level
        for (const recipeVersion of deployment.recipeVersions) {
          const existing = recipeVersionsMap.get(recipeVersion.recipeId);
          if (!existing || recipeVersion.version > existing.version) {
            recipeVersionsMap.set(recipeVersion.recipeId, {
              ...recipeVersion,
              deploymentDate: deployment.createdAt,
            });
          }
        }
      }

      // Convert to DeployedRecipeTargetInfo format
      for (const [recipeId, deployedVersion] of recipeVersionsMap.entries()) {
        const recipe = this.getLatestRecipe(recipeId, recipes);

        // Convert recipe to RecipeVersion format
        const latestVersion: RecipeVersion = {
          id: createRecipeVersionId(recipe.id),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          version: recipe.version,
          content: recipe.content,
          gitCommit: recipe.gitCommit,
          userId: recipe.userId,
        };

        const isUpToDate = deployedVersion.version >= latestVersion.version;

        if (!isUpToDate) {
          hasOutdatedRecipes = true;
        }

        deployedRecipes.push({
          recipe,
          deployedVersion,
          latestVersion,
          isUpToDate,
          deploymentDate: deployedVersion.deploymentDate,
        });
      }

      targetStatuses.push({
        target,
        gitRepo,
        deployedRecipes,
        hasOutdatedRecipes,
      });
    }

    return targetStatuses;
  }
}
