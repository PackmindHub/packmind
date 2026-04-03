import { PackmindLogger } from '@packmind/logger';
import {
  IStandardsPort,
  IRecipesPort,
  IGitPort,
  IGetDashboardOutdated,
  GetDashboardOutdatedCommand,
  DashboardOutdatedResponse,
  DashboardOutdatedTarget,
  DeployedStandardTargetInfo,
  DeployedRecipeTargetInfo,
  OrganizationId,
  Standard,
  StandardId,
  StandardVersion,
  Recipe,
  RecipeId,
  RecipeVersion,
  GitRepo,
  createStandardVersionId,
  createRecipeVersionId,
} from '@packmind/types';
import {
  IDistributionRepository,
  OutdatedDeploymentInfo,
} from '../../../domain/repositories/IDistributionRepository';

const origin = 'GetDashboardOutdatedUseCase';

export class GetDashboardOutdatedUseCase implements IGetDashboardOutdated {
  constructor(
    private readonly distributionRepository: IDistributionRepository,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly gitPort: IGitPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: GetDashboardOutdatedCommand,
  ): Promise<DashboardOutdatedResponse> {
    this.logger.info('Getting dashboard outdated artifacts', {
      organizationId: command.organizationId,
      spaceId: command.spaceId,
    });

    const [outdatedByTarget, standards, recipes, gitRepos] = await Promise.all([
      this.distributionRepository.findOutdatedDeploymentsBySpace(
        command.organizationId as OrganizationId,
        command.spaceId,
      ),
      this.standardsPort.listStandardsBySpace(
        command.spaceId,
        command.organizationId as OrganizationId,
        command.userId,
      ),
      this.recipesPort.listRecipesBySpace({
        spaceId: command.spaceId,
        organizationId: command.organizationId as OrganizationId,
        userId: command.userId,
      }),
      this.gitPort.getOrganizationRepositories(
        command.organizationId as OrganizationId,
      ),
    ]);

    const standardsMap = new Map<string, Standard>(
      standards.map((s) => [s.id, s]),
    );
    const recipesMap = new Map<string, Recipe>(recipes.map((r) => [r.id, r]));
    const gitReposMap = new Map<string, GitRepo>(
      gitRepos.map((r) => [r.id, r]),
    );

    const targets: DashboardOutdatedTarget[] = [];

    for (const targetData of outdatedByTarget) {
      const gitRepo = gitReposMap.get(targetData.gitRepoId);
      if (!gitRepo) continue;

      const outdatedStandards = await this.resolveOutdatedStandards(
        targetData.standards,
        standardsMap,
      );

      const outdatedRecipes = await this.resolveOutdatedRecipes(
        targetData.recipes,
        recipesMap,
      );

      if (outdatedStandards.length === 0 && outdatedRecipes.length === 0) {
        continue;
      }

      targets.push({
        target: {
          id: targetData.targetId,
          name: targetData.targetName,
          path: '',
          gitRepoId: gitRepo.id,
        },
        gitRepo,
        outdatedStandards,
        outdatedRecipes,
      });
    }

    return { targets };
  }

  private async resolveOutdatedStandards(
    deployments: OutdatedDeploymentInfo[],
    standardsMap: Map<string, Standard>,
  ): Promise<DeployedStandardTargetInfo[]> {
    const result: DeployedStandardTargetInfo[] = [];

    for (const deployment of deployments) {
      let standard = standardsMap.get(deployment.artifactId);
      let isDeleted = false;

      if (!standard) {
        standard =
          (await this.standardsPort.getStandard(
            deployment.artifactId as StandardId,
          )) ?? undefined;
        isDeleted = true;
      }

      if (!standard) continue;

      const latestVersion = standard.version;
      const isUpToDate =
        deployment.deployedVersion >= latestVersion && !isDeleted;

      if (isUpToDate) continue;

      const deployedVersion: StandardVersion = {
        id: createStandardVersionId(deployment.artifactId),
        standardId: standard.id,
        name: standard.name,
        slug: standard.slug,
        version: deployment.deployedVersion,
        description: standard.description,
        summary: null,
        userId: standard.userId,
        scope: standard.scope,
      };

      const latestStandardVersion: StandardVersion = {
        id: createStandardVersionId(standard.id),
        standardId: standard.id,
        name: standard.name,
        slug: standard.slug,
        version: latestVersion,
        description: standard.description,
        summary: null,
        userId: standard.userId,
        scope: standard.scope,
      };

      result.push({
        standard,
        deployedVersion,
        latestVersion: latestStandardVersion,
        isUpToDate: false,
        deploymentDate: deployment.deploymentDate,
        ...(isDeleted && { isDeleted }),
      });
    }

    return result;
  }

  private async resolveOutdatedRecipes(
    deployments: OutdatedDeploymentInfo[],
    recipesMap: Map<string, Recipe>,
  ): Promise<DeployedRecipeTargetInfo[]> {
    const result: DeployedRecipeTargetInfo[] = [];

    for (const deployment of deployments) {
      let recipe = recipesMap.get(deployment.artifactId);
      let isDeleted = false;

      if (!recipe) {
        recipe =
          (await this.recipesPort.getRecipeByIdInternal(
            deployment.artifactId as RecipeId,
          )) ?? undefined;
        isDeleted = true;
      }

      if (!recipe) continue;

      const latestVersion = recipe.version;
      const isUpToDate =
        deployment.deployedVersion >= latestVersion && !isDeleted;

      if (isUpToDate) continue;

      const deployedVersion: RecipeVersion = {
        id: createRecipeVersionId(deployment.artifactId),
        recipeId: recipe.id,
        name: recipe.name,
        slug: recipe.slug,
        content: recipe.content,
        version: deployment.deployedVersion,
        userId: recipe.userId,
      };

      const latestRecipeVersion: RecipeVersion = {
        id: createRecipeVersionId(recipe.id),
        recipeId: recipe.id,
        name: recipe.name,
        slug: recipe.slug,
        content: recipe.content,
        version: latestVersion,
        userId: recipe.userId,
      };

      result.push({
        recipe,
        deployedVersion,
        latestVersion: latestRecipeVersion,
        isUpToDate: false,
        deploymentDate: deployment.deploymentDate,
        ...(isDeleted && { isDeleted }),
      });
    }

    return result;
  }
}
