import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  ActiveDistributedPackage,
  ActiveDistributedPackagesByTarget,
  createCommandVersionId,
  createSkillVersionId,
  createStandardVersionId,
  createUserId,
  DeployedCommandTargetInfo,
  DeployedSkillTargetInfo,
  DeployedStandardTargetInfo,
  IAccountsPort,
  IGitPort,
  IListActiveDistributedPackagesBySpaceUseCase,
  ICommandsPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  ListActiveDistributedPackagesBySpaceCommand,
  ListActiveDistributedPackagesBySpaceResponse,
  Package,
  PendingCommandInfo,
  PendingSkillInfo,
  PendingStandardInfo,
  Command,
  CommandId,
  CommandVersion,
  Skill,
  SkillId,
  SkillVersion,
  Standard,
  StandardId,
  StandardVersion,
  TargetId,
} from '@packmind/types';
import {
  ActivePackageOperationRow,
  IDistributionRepository,
  OutdatedDeploymentsByTarget,
  OutdatedCommandDeployment,
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
    private readonly commandsPort: ICommandsPort,
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

    const [
      activeOpsR,
      outdatedR,
      targetsR,
      standardsR,
      commandsR,
      skillsR,
      packagesR,
      gitReposR,
    ] = await Promise.allSettled([
      this.distributionRepository.findActivePackageOperationsBySpace(
        command.spaceId,
      ),
      this.distributionRepository.findOutdatedDeploymentsBySpace(
        organizationId,
        command.spaceId,
      ),
      this.targetRepository.findActiveInSpace(organizationId, command.spaceId),
      this.standardsPort.listStandardsBySpace(
        command.spaceId,
        organizationId,
        command.userId,
      ),
      this.commandsPort.listCommandsBySpace({
        spaceId: command.spaceId,
        organizationId,
        userId: command.userId,
      }),
      this.skillsPort.listSkillsBySpace(
        command.spaceId,
        organizationId,
        command.userId,
      ),
      this.packageRepository.findBySpaceId(command.spaceId),
      this.gitPort.getOrganizationRepositories(organizationId),
    ] as const);

    const value = <T>(r: PromiseSettledResult<T>): T => {
      if (r.status === 'rejected') throw r.reason;
      return r.value;
    };

    const activeOps = value(activeOpsR);
    const outdatedByTarget = value(outdatedR);
    const targets = value(targetsR);
    const standards = value(standardsR);
    const recipes = value(commandsR);
    const skills = value(skillsR);
    const packages = value(packagesR);
    const gitRepos = value(gitReposR);

    if (targets.length === 0) {
      return [];
    }

    const operationsByTarget = groupActiveOpsByTarget(activeOps);
    const outdatedByTargetId = indexOutdatedByTarget(outdatedByTarget);
    const standardsById = indexById(standards);
    const commandsById = indexById(recipes);
    const skillsById = indexById(skills);
    const packagesById = indexById(packages);
    const gitRepoById = new Map(gitRepos.map((r) => [r.id, r]));

    return targets.map((target): ActiveDistributedPackagesByTarget => {
      const outdated = outdatedByTargetId.get(target.id) ?? {
        standards: [],
        recipes: [],
        skills: [],
      };
      const targetActiveOps = operationsByTarget.get(target.id) ?? [];

      const deployedStandards = outdated.standards.map((deployment) =>
        buildDeployedStandardInfo(
          deployment,
          standardsById.get(deployment.artifactId),
        ),
      );
      const deployedCommands = outdated.recipes.map((deployment) =>
        buildDeployedCommandInfo(
          deployment,
          commandsById.get(deployment.artifactId),
        ),
      );
      const deployedSkills = outdated.skills.map((deployment) =>
        buildDeployedSkillInfo(
          deployment,
          skillsById.get(deployment.artifactId),
        ),
      );

      return {
        targetId: target.id,
        target,
        gitRepo: gitRepoById.get(target.gitRepoId) ?? null,
        packages: targetActiveOps
          .map((row) =>
            buildActivePackage({
              row,
              pkg: packagesById.get(row.packageId),
              deployedCommands,
              deployedStandards,
              deployedSkills,
              commandsById,
              standardsById,
              skillsById,
            }),
          )
          .filter((entry): entry is ActiveDistributedPackage => entry !== null),
      };
    });
  }
}

function buildActivePackage(args: {
  row: ActivePackageOperationRow;
  pkg: Package | undefined;
  deployedCommands: DeployedCommandTargetInfo[];
  deployedStandards: DeployedStandardTargetInfo[];
  deployedSkills: DeployedSkillTargetInfo[];
  commandsById: Map<string, Command>;
  standardsById: Map<string, Standard>;
  skillsById: Map<string, Skill>;
}): ActiveDistributedPackage | null {
  const {
    row,
    pkg,
    deployedCommands,
    deployedStandards,
    deployedSkills,
    commandsById,
    standardsById,
    skillsById,
  } = args;
  if (!pkg) return null;

  const pkgCommandIds = new Set<CommandId>(pkg.recipes);
  const pkgStandardIds = new Set<StandardId>(pkg.standards);
  const pkgSkillIds = new Set<SkillId>(pkg.skills);

  const packageDeployedCommands = deployedCommands.filter((r) =>
    pkgCommandIds.has(r.recipe.id),
  );
  const packageDeployedStandards = deployedStandards.filter((s) =>
    pkgStandardIds.has(s.standard.id),
  );
  const packageDeployedSkills = deployedSkills.filter((s) =>
    pkgSkillIds.has(s.skill.id),
  );

  const deployedCommandIds = new Set(
    packageDeployedCommands.map((r) => r.recipe.id),
  );
  const deployedStandardIds = new Set(
    packageDeployedStandards.map((s) => s.standard.id),
  );
  const deployedSkillIds = new Set(
    packageDeployedSkills.map((s) => s.skill.id),
  );

  const pendingCommands: PendingCommandInfo[] = pkg.recipes
    .filter((id) => !deployedCommandIds.has(id))
    .map((id) => commandsById.get(id))
    .filter((r): r is Command => Boolean(r))
    .map((r) => ({ id: r.id, name: r.name, slug: r.slug }));

  const pendingStandards: PendingStandardInfo[] = pkg.standards
    .filter((id) => !deployedStandardIds.has(id))
    .map((id) => standardsById.get(id))
    .filter((s): s is Standard => Boolean(s))
    .map((s) => ({ id: s.id, name: s.name, slug: s.slug }));

  const pendingSkills: PendingSkillInfo[] = pkg.skills
    .filter((id) => !deployedSkillIds.has(id))
    .map((id) => skillsById.get(id))
    .filter((s): s is Skill => Boolean(s))
    .map((s) => ({ id: s.id, name: s.name, slug: s.slug }));

  return {
    packageId: row.packageId,
    package: pkg,
    lastDistributionStatus: row.lastDistributionStatus,
    lastDistributedAt: row.lastDistributedAt,
    deployedRecipes: packageDeployedCommands,
    deployedStandards: packageDeployedStandards,
    deployedSkills: packageDeployedSkills,
    pendingRecipes: pendingCommands,
    pendingStandards,
    pendingSkills,
  };
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
  const description = standard?.description ?? '';
  const userId = standard?.userId ?? null;
  const scope = standard?.scope ?? null;
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

function buildDeployedCommandInfo(
  deployment: OutdatedCommandDeployment,
  recipe: Command | undefined,
): DeployedCommandTargetInfo {
  const baseId = recipe?.id ?? deployment.artifactId;
  const name = recipe?.name ?? deployment.artifactName;
  const slug = recipe?.slug ?? deployment.artifactSlug;
  const content = recipe?.content ?? '';
  const userId = recipe?.userId ?? null;
  const latestVersionNumber = recipe?.version ?? deployment.deployedVersion;
  const isDeleted = !recipe;
  const isUpToDate =
    !isDeleted && deployment.deployedVersion === latestVersionNumber;

  const buildVersion = (version: number): CommandVersion => ({
    id: createCommandVersionId(baseId),
    recipeId: baseId,
    name,
    slug,
    content,
    version,
    userId,
  });

  const syntheticCommand = {
    id: baseId,
    name,
    slug,
    content,
    version: deployment.deployedVersion,
    userId,
  } as Command;

  return {
    recipe: recipe ?? syntheticCommand,
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
  const description = skill?.description ?? '';
  const prompt = skill?.prompt ?? '';
  const userId = skill?.userId ?? createUserId('');
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
