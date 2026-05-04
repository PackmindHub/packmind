import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  ActiveDistributedPackagesByTarget,
  createRecipeVersionId,
  createSkillVersionId,
  createStandardVersionId,
  DeployedRecipeTargetInfo,
  DeployedSkillTargetInfo,
  DeployedStandardTargetInfo,
  IAccountsPort,
  IGitPort,
  IListActiveDistributedPackagesBySpaceUseCase,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  ListActiveDistributedPackagesBySpaceCommand,
  ListActiveDistributedPackagesBySpaceResponse,
  Recipe,
  RecipeVersion,
  Skill,
  SkillVersion,
  Standard,
  StandardVersion,
  TargetId,
} from '@packmind/types';
import {
  ActivePackageOperationRow,
  IDistributionRepository,
  OutdatedDeploymentsByTarget,
  OutdatedRecipeDeployment,
  OutdatedSkillDeployment,
  OutdatedStandardDeployment,
} from '../../domain/repositories/IDistributionRepository';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';
import { ITargetRepository } from '../../domain/repositories/ITargetRepository';

const origin = 'ListActiveDistributedPackagesBySpaceUseCase';

export class ListActiveDistributedPackagesBySpaceUseCase
  extends AbstractSpaceMemberUseCase<
    ListActiveDistributedPackagesBySpaceCommand,
    ListActiveDistributedPackagesBySpaceResponse
  >
  implements IListActiveDistributedPackagesBySpaceUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsAdapter: IAccountsPort,
    private readonly distributionRepository: IDistributionRepository,
    private readonly packageRepository: IPackageRepository,
    private readonly targetRepository: ITargetRepository,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly skillsPort: ISkillsPort,
    private readonly gitPort: IGitPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsAdapter, logger);
  }

  async executeForSpaceMembers(
    command: ListActiveDistributedPackagesBySpaceCommand & SpaceMemberContext,
  ): Promise<ListActiveDistributedPackagesBySpaceResponse> {
    const organizationId = command.organization.id;
    const activeOps =
      await this.distributionRepository.findActivePackageOperationsBySpace(
        command.spaceId,
      );
    const outdatedByTarget =
      await this.distributionRepository.findOutdatedDeploymentsBySpace(
        organizationId,
        command.spaceId,
      );
    const targets = await this.targetRepository.findActiveInSpace(
      organizationId,
      command.spaceId,
    );
    const standards = await this.standardsPort.listStandardsBySpace(
      command.spaceId,
      organizationId,
      command.userId,
    );
    const recipes = await this.recipesPort.listRecipesBySpace({
      spaceId: command.spaceId,
      organizationId,
      userId: command.userId,
    });
    const skills = await this.skillsPort.listSkillsBySpace(
      command.spaceId,
      organizationId,
      command.userId,
    );

    const gitRepos =
      await this.gitPort.getOrganizationRepositories(organizationId);

    if (targets.length === 0) {
      return [];
    }

    const operationsByTarget = groupActiveOpsByTarget(activeOps);
    const outdatedByTargetId = indexOutdatedByTarget(outdatedByTarget);
    const standardsById = indexById(standards);
    const recipesById = indexById(recipes);
    const skillsById = indexById(skills);

    return targets.map((target): ActiveDistributedPackagesByTarget => {
      const outdated = outdatedByTargetId.get(target.id) ?? {
        standards: [],
        recipes: [],
        skills: [],
      };
      const targetPackages = operationsByTarget.get(target.id) ?? [];

      return {
        targetId: target.id,
        target,
        gitRepo: gitRepos.find((r) => r.id === target.gitRepoId) ?? null,
        packages: targetPackages.map((row) => ({
          packageId: row.packageId,
          lastDistributionStatus: row.lastDistributionStatus,
          lastDistributedAt: row.lastDistributedAt,
        })),
        deployedStandards: outdated.standards.map((deployment) =>
          buildDeployedStandardInfo(
            deployment,
            standardsById.get(deployment.artifactId),
          ),
        ),
        deployedRecipes: outdated.recipes.map((deployment) =>
          buildDeployedRecipeInfo(
            deployment,
            recipesById.get(deployment.artifactId),
          ),
        ),
        deployedSkills: outdated.skills.map((deployment) =>
          buildDeployedSkillInfo(
            deployment,
            skillsById.get(deployment.artifactId),
          ),
        ),
      };
    });
  }
}

function groupActiveOpsByTarget(
  rows: ActivePackageOperationRow[],
): Map<TargetId, ActivePackageOperationRow[]> {
  const map = new Map<TargetId, ActivePackageOperationRow[]>();
  for (const row of rows) {
    const existing = map.get(row.targetId);
    if (existing) {
      existing.push(row);
    } else {
      map.set(row.targetId, [row]);
    }
  }
  return map;
}

function indexOutdatedByTarget(
  rows: OutdatedDeploymentsByTarget[],
): Map<TargetId, OutdatedDeploymentsByTarget> {
  return new Map(rows.map((row) => [row.targetId, row]));
}

function indexById<T extends { id: string }>(
  items: readonly T[],
): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function buildDeployedStandardInfo(
  deployment: OutdatedStandardDeployment,
  standard: Standard | undefined,
): DeployedStandardTargetInfo {
  const baseId = standard?.id ?? deployment.artifactId;
  const name = standard?.name ?? deployment.artifactName;
  const slug = standard?.slug ?? deployment.artifactSlug;
  const description = standard?.description ?? deployment.description;
  const userId = standard?.userId ?? deployment.userId;
  const scope = standard?.scope ?? deployment.scope;
  const latestVersionNumber = standard?.version ?? deployment.deployedVersion;
  const isDeleted = !standard;
  const isUpToDate =
    !isDeleted && deployment.deployedVersion === latestVersionNumber;

  const buildVersion = (version: number): StandardVersion => ({
    id: createStandardVersionId(baseId),
    standardId: baseId,
    name,
    slug,
    version,
    description,
    summary: deployment.summary ?? null,
    userId,
    scope,
  });

  const syntheticStandard = {
    id: baseId,
    name,
    slug,
    description,
    version: deployment.deployedVersion,
    userId,
    scope,
  } as Standard;

  return {
    standard: standard ?? syntheticStandard,
    deployedVersion: buildVersion(deployment.deployedVersion),
    latestVersion: buildVersion(latestVersionNumber),
    isUpToDate,
    deploymentDate: deployment.deploymentDate,
    ...(isDeleted && { isDeleted: true }),
  };
}

function buildDeployedRecipeInfo(
  deployment: OutdatedRecipeDeployment,
  recipe: Recipe | undefined,
): DeployedRecipeTargetInfo {
  const baseId = recipe?.id ?? deployment.artifactId;
  const name = recipe?.name ?? deployment.artifactName;
  const slug = recipe?.slug ?? deployment.artifactSlug;
  const content = recipe?.content ?? deployment.content;
  const userId = recipe?.userId ?? deployment.userId;
  const latestVersionNumber = recipe?.version ?? deployment.deployedVersion;
  const isDeleted = !recipe;
  const isUpToDate =
    !isDeleted && deployment.deployedVersion === latestVersionNumber;

  const buildVersion = (version: number): RecipeVersion => ({
    id: createRecipeVersionId(baseId),
    recipeId: baseId,
    name,
    slug,
    content,
    version,
    userId,
  });

  const syntheticRecipe = {
    id: baseId,
    name,
    slug,
    content,
    version: deployment.deployedVersion,
    userId,
  } as Recipe;

  return {
    recipe: recipe ?? syntheticRecipe,
    deployedVersion: buildVersion(deployment.deployedVersion),
    latestVersion: buildVersion(latestVersionNumber),
    isUpToDate,
    deploymentDate: deployment.deploymentDate,
    ...(isDeleted && { isDeleted: true }),
  };
}

function buildDeployedSkillInfo(
  deployment: OutdatedSkillDeployment,
  skill: Skill | undefined,
): DeployedSkillTargetInfo {
  const baseId = skill?.id ?? deployment.artifactId;
  const name = skill?.name ?? deployment.artifactName;
  const slug = skill?.slug ?? deployment.artifactSlug;
  const description = skill?.description ?? deployment.description;
  const prompt = skill?.prompt ?? deployment.prompt;
  const userId = skill?.userId ?? deployment.userId;
  const latestVersionNumber = skill?.version ?? deployment.deployedVersion;
  const isDeleted = !skill;
  const isUpToDate =
    !isDeleted && deployment.deployedVersion === latestVersionNumber;

  const buildVersion = (version: number): SkillVersion => ({
    id: createSkillVersionId(baseId),
    skillId: baseId,
    name,
    slug,
    description,
    prompt,
    version,
    userId,
  });

  const syntheticSkill = {
    id: baseId,
    name,
    slug,
    description,
    prompt,
    version: deployment.deployedVersion,
    userId,
  } as Skill;

  return {
    skill: skill ?? syntheticSkill,
    deployedVersion: buildVersion(deployment.deployedVersion),
    latestVersion: buildVersion(latestVersionNumber),
    isUpToDate,
    deploymentDate: deployment.deploymentDate,
    ...(isDeleted && { isDeleted: true }),
  };
}
