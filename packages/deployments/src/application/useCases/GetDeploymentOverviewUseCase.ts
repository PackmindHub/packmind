import { PackmindLogger } from '@packmind/logger';
import { WithTimestamps } from '@packmind/node-utils';
import { ISpacesPort } from '@packmind/types';
import { IRecipesPort } from '@packmind/types';
import { IGitPort } from '@packmind/types';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { createUserId } from '@packmind/types';
import {
  DeploymentOverview,
  GetDeploymentOverviewCommand,
  IGetDeploymentOverview,
  RecipeDeploymentStatus,
  RepositoryDeploymentStatus,
  TargetDeploymentStatus,
  TargetDeploymentInfo,
  DeployedRecipeTargetInfo,
  Distribution,
  DistributionStatus,
  TargetWithRepository,
  GitRepoId,
} from '@packmind/types';
import {
  GitRepo,
  Recipe,
  RecipeId,
  RecipeVersion,
  createRecipeVersionId,
} from '@packmind/types';
import assert from 'assert';
import { GetTargetsByOrganizationUseCase } from './GetTargetsByOrganizationUseCase';

const origin = 'GetDeploymentOverviewUseCase';

export class GetDeploymentOverviewUseCase implements IGetDeploymentOverview {
  constructor(
    private readonly distributionRepository: IDistributionRepository,
    private readonly recipesPort: IRecipesPort,
    private readonly spacesPort: ISpacesPort,
    private readonly gitPort: IGitPort,
    private readonly getTargetsByOrganizationUseCase: GetTargetsByOrganizationUseCase,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('GetDeploymentOverviewUseCase initialized');
  }

  async execute(
    command: GetDeploymentOverviewCommand,
  ): Promise<DeploymentOverview> {
    const { organizationId } = command;
    this.logger.info('Fetching deployment overview', { organizationId });

    try {
      // Get all spaces for the organization
      const spaces =
        await this.spacesPort.listSpacesByOrganization(organizationId);

      // Fetch all required data - only successful deployments for overview
      if (!this.recipesPort.listRecipesBySpace) {
        throw new Error('RecipesPort.listRecipesBySpace is not available');
      }

      const [distributions, recipesPerSpace, gitRepos] = await Promise.all([
        this.distributionRepository.listByOrganizationIdWithStatus(
          organizationId,
          DistributionStatus.success,
        ),
        Promise.all(
          spaces.map((space) =>
            this.recipesPort.listRecipesBySpace({
              spaceId: space.id,
              organizationId,
              userId: createUserId(command.userId),
            }),
          ),
        ),
        this.gitPort.getOrganizationRepositories(organizationId),
      ]);

      // Flatten recipes from all spaces
      const recipes = recipesPerSpace.flat();

      // Build a map of latest recipe versions per target (target-centric approach)
      const latestRecipeVersionsMap = new Map<
        GitRepoId,
        WithTimestamps<RecipeVersion>[]
      >();

      // Process distributions to extract latest recipe versions per target's repository
      for (const distribution of distributions) {
        // Handle both old array-based and new single-reference models
        const targets = distribution.target ? [distribution.target] : [];

        // Flatten recipe versions from all distributed packages
        const recipeVersions = distribution.distributedPackages.flatMap(
          (dp) => dp.recipeVersions,
        );

        for (const target of targets) {
          const gitRepoId = target.gitRepoId;
          const existingVersions = latestRecipeVersionsMap.get(gitRepoId) || [];

          // Convert distribution recipe versions to WithTimestamps format
          const timestampedVersions = recipeVersions.map((rv) => ({
            ...rv,
            createdAt: new Date(distribution.createdAt),
            updatedAt: new Date(distribution.createdAt),
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
        distributions,
      );

      // Get all targets for the organization (including those with no deployments)
      const allTargetsWithRepository =
        await this.getTargetsByOrganizationUseCase.execute({
          organizationId,
          userId: command.userId,
        });

      // Transform data for target-centric view
      const targets = await this.getTargetDeploymentStatus(
        distributions,
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
    allDistributions: Distribution[],
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
        allDistributions,
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
    allDistributions: Distribution[],
    gitRepos: GitRepo[],
  ): TargetDeploymentInfo[] {
    // Filter distributions for this specific recipe
    const recipeDistributions = allDistributions.filter((distribution) =>
      distribution.distributedPackages.some((dp) =>
        dp.recipeVersions.some((rv) => rv.recipeId === recipe.id),
      ),
    );

    // Group by target
    const targetDistributionMap = new Map<string, Distribution[]>();

    for (const distribution of recipeDistributions) {
      if (distribution.target) {
        const targetId = distribution.target.id;
        if (!targetDistributionMap.has(targetId)) {
          targetDistributionMap.set(targetId, []);
        }
        const targetDistributions = targetDistributionMap.get(targetId);
        if (targetDistributions) {
          targetDistributions.push(distribution);
        }
      }
    }

    const targetDeployments: TargetDeploymentInfo[] = [];

    for (const [, targetDistributions] of targetDistributionMap.entries()) {
      const target = targetDistributions[0]?.target;
      if (!target) continue;
      const gitRepo = gitRepos.find((repo) => repo.id === target.gitRepoId);

      if (!gitRepo) continue;

      // Find the latest deployed version for this recipe on this target
      let latestDeployedVersion: RecipeVersion | null = null;
      let latestDeploymentDate = '';

      for (const distribution of targetDistributions) {
        const recipeVersions = distribution.distributedPackages.flatMap(
          (dp) => dp.recipeVersions,
        );
        for (const recipeVersion of recipeVersions) {
          if (recipeVersion.recipeId === recipe.id) {
            if (
              !latestDeployedVersion ||
              recipeVersion.version > latestDeployedVersion.version
            ) {
              latestDeployedVersion = recipeVersion;
              latestDeploymentDate = distribution.createdAt;
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
    distributions: Distribution[],
    gitRepos: GitRepo[],
    recipes: Recipe[],
    allTargetsWithRepository?: TargetWithRepository[], // All targets including those with no deployments
  ): Promise<TargetDeploymentStatus[]> {
    // Group distributions by target
    const targetMap = new Map<string, Distribution[]>();

    for (const distribution of distributions) {
      if (distribution.target) {
        const targetId = distribution.target.id;
        if (!targetMap.has(targetId)) {
          targetMap.set(targetId, []);
        }
        const targetDistributions = targetMap.get(targetId);
        if (targetDistributions) {
          targetDistributions.push(distribution);
        }
      }
    }

    // Build target deployment status for each target (both with and without deployments)
    const targetStatuses: TargetDeploymentStatus[] = [];

    // If we have allTargetsWithRepository, include all targets (even those without deployments)
    const targetsToProcess = allTargetsWithRepository || [];

    // Add targets from distributions that might not be in allTargetsWithRepository (fallback)
    if (!allTargetsWithRepository) {
      for (const [, targetDistributions] of targetMap.entries()) {
        const target = targetDistributions[0]?.target;
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

      const targetDistributions = targetMap.get(target.id) || []; // Empty array for targets with no distributions

      // Get deployed recipes for this target
      const deployedRecipes: DeployedRecipeTargetInfo[] = [];
      let hasOutdatedRecipes = false;

      // Process each recipe deployed to this target
      const recipeVersionsMap = new Map<
        RecipeId,
        RecipeVersion & { deploymentDate: string }
      >();

      for (const distribution of targetDistributions) {
        // All distributions are successful since we filtered at query level
        const recipeVersions = distribution.distributedPackages.flatMap(
          (dp) => dp.recipeVersions,
        );
        for (const recipeVersion of recipeVersions) {
          const existing = recipeVersionsMap.get(recipeVersion.recipeId);
          if (!existing || recipeVersion.version > existing.version) {
            recipeVersionsMap.set(recipeVersion.recipeId, {
              ...recipeVersion,
              deploymentDate: distribution.createdAt,
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
