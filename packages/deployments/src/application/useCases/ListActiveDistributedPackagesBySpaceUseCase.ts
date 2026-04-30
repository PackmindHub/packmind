import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  ActiveDistributedPackage,
  ActiveDistributedPackagesByTarget,
  createRecipeVersionId,
  createSkillVersionId,
  createStandardVersionId,
  DeployedRecipeTargetInfo,
  DeployedSkillTargetInfo,
  DeployedStandardTargetInfo,
  DistributionStatus,
  GitRepo,
  IAccountsPort,
  IGitPort,
  IListActiveDistributedPackagesBySpaceUseCase,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  ListActiveDistributedPackagesBySpaceCommand,
  ListActiveDistributedPackagesBySpaceResponse,
  PackageArtifactCounts,
  PackageId,
  Recipe,
  RecipeId,
  RecipeVersion,
  Skill,
  SkillId,
  SkillVersion,
  Standard,
  StandardId,
  StandardVersion,
  Target,
  TargetId,
} from '@packmind/types';
import {
  IDistributionRepository,
  LatestPackageOperationRow,
  OutdatedDeploymentInfo,
} from '../../domain/repositories/IDistributionRepository';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';
import { ITargetRepository } from '../../domain/repositories/ITargetRepository';

const origin = 'ListActiveDistributedPackagesBySpaceUseCase';

const EMPTY_COUNTS: PackageArtifactCounts = {
  recipes: 0,
  standards: 0,
  skills: 0,
};

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
    const [latestRows, outdatedByTarget, standards, recipes, skills, gitRepos] =
      await Promise.all([
        this.distributionRepository.findLatestPackageOperationsBySpace(
          command.spaceId,
        ),
        this.distributionRepository.findOutdatedDeploymentsBySpace(
          organizationId,
          command.spaceId,
        ),
        this.standardsPort.listStandardsBySpace(
          command.spaceId,
          organizationId,
          command.userId,
        ),
        this.recipesPort.listRecipesBySpace({
          spaceId: command.spaceId,
          organizationId,
          userId: command.userId,
        }),
        this.skillsPort.listSkillsBySpace(
          command.spaceId,
          organizationId,
          command.userId,
        ),
        this.gitPort.getOrganizationRepositories(organizationId),
      ]);

    const projected = projectActiveDistributedPackagesByTarget(latestRows);

    const uniquePackageIds = Array.from(
      new Set<PackageId>(
        projected.flatMap((entry) => entry.packages.map((p) => p.packageId)),
      ),
    );

    const counts =
      await this.packageRepository.countArtifactsForPackages(uniquePackageIds);

    const allTargetIds = Array.from(
      new Set<TargetId>([
        ...projected.map((entry) => entry.targetId),
        ...outdatedByTarget.map((entry) => entry.targetId),
      ]),
    );

    const targets = await this.targetRepository.findByIdsInOrganization(
      allTargetIds,
      organizationId,
    );
    const targetMap = new Map(targets.map((t) => [t.id, t]));
    const standardsMap = new Map(standards.map((s) => [s.id as string, s]));
    const recipesMap = new Map(recipes.map((r) => [r.id as string, r]));
    const skillsMap = new Map(skills.map((s) => [s.id as string, s]));
    const gitReposMap = new Map(gitRepos.map((r) => [r.id, r]));
    const projectedByTarget = new Map(
      projected.map((entry) => [entry.targetId, entry.packages]),
    );
    const outdatedByTargetId = new Map(
      outdatedByTarget.map((entry) => [entry.targetId, entry]),
    );

    const entries = await Promise.all(
      allTargetIds.map((targetId) =>
        this.buildTargetEntry({
          targetId,
          target: targetMap.get(targetId),
          gitReposMap,
          packages: projectedByTarget.get(targetId) ?? [],
          counts,
          outdated: outdatedByTargetId.get(targetId),
          standardsMap,
          recipesMap,
          skillsMap,
        }),
      ),
    );

    return entries.filter(
      (entry): entry is ActiveDistributedPackagesByTarget => entry !== null,
    );
  }

  private async buildTargetEntry(args: {
    targetId: TargetId;
    target: Target | undefined;
    gitReposMap: Map<string, GitRepo>;
    packages: ProjectedActivePackage[];
    counts: Map<PackageId, PackageArtifactCounts>;
    outdated:
      | {
          standards: OutdatedDeploymentInfo[];
          recipes: OutdatedDeploymentInfo[];
          skills: OutdatedDeploymentInfo[];
        }
      | undefined;
    standardsMap: Map<string, Standard>;
    recipesMap: Map<string, Recipe>;
    skillsMap: Map<string, Skill>;
  }): Promise<ActiveDistributedPackagesByTarget | null> {
    const { targetId, target, gitReposMap, packages, counts, outdated } = args;
    if (!target) return null;

    const enrichedPackages: ActiveDistributedPackage[] = packages.map(
      (pkg) => ({
        ...pkg,
        artifactCounts: counts.get(pkg.packageId) ?? EMPTY_COUNTS,
      }),
    );

    const [outdatedStandards, outdatedRecipes, outdatedSkills] =
      await Promise.all([
        resolveOutdatedDeployments(
          outdated?.standards ?? [],
          args.standardsMap,
          (id) => this.standardsPort.getStandard(id as StandardId),
          buildDeployedStandardInfo,
        ),
        resolveOutdatedDeployments(
          outdated?.recipes ?? [],
          args.recipesMap,
          (id) => this.recipesPort.getRecipeByIdInternal(id as RecipeId),
          buildDeployedRecipeInfo,
        ),
        resolveOutdatedDeployments(
          outdated?.skills ?? [],
          args.skillsMap,
          (id) => this.skillsPort.getSkill(id as SkillId),
          buildDeployedSkillInfo,
        ),
      ]);

    return {
      targetId,
      target,
      gitRepo: gitReposMap.get(target.gitRepoId) ?? null,
      packages: enrichedPackages,
      outdatedStandards,
      outdatedRecipes,
      outdatedSkills,
    };
  }
}

async function resolveOutdatedDeployments<
  TEntity extends { version: number },
  TInfo,
>(
  deployments: OutdatedDeploymentInfo[],
  entityMap: Map<string, TEntity>,
  fetchById: (id: string) => Promise<TEntity | null>,
  buildInfo: (
    entity: TEntity,
    deployment: OutdatedDeploymentInfo,
    isDeleted: boolean,
  ) => TInfo,
): Promise<TInfo[]> {
  const resolved = await Promise.all(
    deployments.map(async (deployment) => {
      const cached = entityMap.get(deployment.artifactId);
      const entity = cached ?? (await fetchById(deployment.artifactId));
      if (!entity) return undefined;

      const isDeleted = !cached;
      const isUpToDate =
        deployment.deployedVersion >= entity.version && !isDeleted;
      if (isUpToDate) return undefined;

      return buildInfo(entity, deployment, isDeleted);
    }),
  );
  return resolved.filter((info): info is Awaited<TInfo> => info !== undefined);
}

function toStandardVersion(
  standard: Standard,
  version: number,
): StandardVersion {
  return {
    id: createStandardVersionId(standard.id),
    standardId: standard.id,
    name: standard.name,
    slug: standard.slug,
    version,
    description: standard.description,
    summary: null,
    userId: standard.userId,
    scope: standard.scope,
  };
}

function toRecipeVersion(recipe: Recipe, version: number): RecipeVersion {
  return {
    id: createRecipeVersionId(recipe.id),
    recipeId: recipe.id,
    name: recipe.name,
    slug: recipe.slug,
    content: recipe.content,
    version,
    userId: recipe.userId,
  };
}

function toSkillVersion(skill: Skill, version: number): SkillVersion {
  return {
    id: createSkillVersionId(skill.id),
    skillId: skill.id,
    name: skill.name,
    slug: skill.slug,
    description: skill.description,
    prompt: skill.prompt,
    version,
    userId: skill.userId,
  };
}

function buildDeployedStandardInfo(
  standard: Standard,
  deployment: OutdatedDeploymentInfo,
  isDeleted: boolean,
): DeployedStandardTargetInfo {
  return {
    standard,
    deployedVersion: toStandardVersion(standard, deployment.deployedVersion),
    latestVersion: toStandardVersion(standard, standard.version),
    isUpToDate: false,
    deploymentDate: deployment.deploymentDate,
    ...(isDeleted && { isDeleted }),
  };
}

function buildDeployedRecipeInfo(
  recipe: Recipe,
  deployment: OutdatedDeploymentInfo,
  isDeleted: boolean,
): DeployedRecipeTargetInfo {
  return {
    recipe,
    deployedVersion: toRecipeVersion(recipe, deployment.deployedVersion),
    latestVersion: toRecipeVersion(recipe, recipe.version),
    isUpToDate: false,
    deploymentDate: deployment.deploymentDate,
    ...(isDeleted && { isDeleted }),
  };
}

function buildDeployedSkillInfo(
  skill: Skill,
  deployment: OutdatedDeploymentInfo,
  isDeleted: boolean,
): DeployedSkillTargetInfo {
  return {
    skill,
    deployedVersion: toSkillVersion(skill, deployment.deployedVersion),
    latestVersion: toSkillVersion(skill, skill.version),
    isUpToDate: false,
    deploymentDate: deployment.deploymentDate,
    ...(isDeleted && { isDeleted }),
  };
}

type ProjectedActivePackage = Omit<ActiveDistributedPackage, 'artifactCounts'>;

type ProjectedActivePackagesByTarget = {
  targetId: TargetId;
  packages: ProjectedActivePackage[];
};

export function projectActiveDistributedPackagesByTarget(
  rows: LatestPackageOperationRow[],
): ProjectedActivePackagesByTarget[] {
  const byTarget = new Map<TargetId, ProjectedActivePackage[]>();
  for (const row of rows) {
    const isActiveFromAdd =
      row.operation === 'add' && row.status !== DistributionStatus.failure;
    const isActiveFromFailedRemove =
      row.operation === 'remove' && row.status === DistributionStatus.failure;
    if (!isActiveFromAdd && !isActiveFromFailedRemove) continue;
    const list = byTarget.get(row.targetId) ?? [];
    list.push({
      packageId: row.packageId,
      lastDistributionStatus: row.status,
      lastDistributedAt: row.lastDistributedAt,
    });
    byTarget.set(row.targetId, list);
  }
  return Array.from(byTarget, ([targetId, packages]) => ({
    targetId,
    packages,
  }));
}
