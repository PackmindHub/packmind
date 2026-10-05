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
  PackageId,
  parsePackageVersionSpec,
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
import { PackageReleaseService } from '../services/PackageReleaseService';
import {
  evaluatePackageReleaseGate,
  type PackageComponentSnapshot,
  type PackageGateSnapshot,
} from '../services/packageReleaseGateHelpers';

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
    private readonly packageReleaseService: PackageReleaseService,
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

    /*
     * Narrowed to the packages some destination is *pinned* to, rather than
     * every package the space holds or even every package it distributes.
     *
     * Release state answers exactly one question — whether a pinned
     * destination is behind — and `destinationStanding` never consults it for
     * a destination tracking the live package. A space whose every
     * `packmind.json` says `*` would pay four queries and three port calls for
     * an answer nothing reads; this costs one pass over rows already in memory.
     */
    const operationsByTarget = groupActiveOpsByTarget(activeOps);
    const outdatedByTargetId = indexOutdatedByTarget(outdatedByTarget);
    const standardsById = indexById(standards);
    const commandsById = indexById(recipes);
    const skillsById = indexById(skills);
    const packagesById = indexById(packages);
    const gitRepoById = new Map(gitRepos.map((r) => [r.id, r]));

    const pinnedPackageIds = pinnedPackagesOf(activeOps);
    const releaseState = await this.readReleaseState(
      packages.filter((pkg) => pinnedPackageIds.has(pkg.id)),
      { commandsById, standardsById, skillsById },
    );

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
              release: releaseState.get(row.packageId) ?? NEVER_RELEASED,
            }),
          )
          .filter((entry): entry is ActiveDistributedPackage => entry !== null),
      };
    });
  }

  /**
   * Where each package stands against its own newest release.
   *
   * One query however many packages are given, and no port call at all: the
   * component versions the gate compares are read off the entities the space
   * read already loaded. They used to be fetched a second time, by id, purely
   * because the gate compared version ids and the list reads carry numbers.
   */
  private async readReleaseState(
    packages: Package[],
    componentVersions: ComponentVersionLookup,
  ): Promise<Map<PackageId, PackageReleaseState>> {
    if (packages.length === 0) return new Map();

    const latestReleases =
      await this.packageReleaseService.findLatestByPackageIds(
        packages.map((pkg) => pkg.id),
      );

    const state = new Map<PackageId, PackageReleaseState>();
    for (const pkg of packages) {
      const latestRelease = latestReleases.get(pkg.id) ?? null;
      state.set(pkg.id, {
        latestReleaseVersion: latestRelease?.version ?? null,
        /*
         * The same gate the release panel reads, so the two cannot disagree
         * about whether there is anything to cut. `no_components` is not an
         * unreleased change: an empty package has nothing to release.
         */
        hasUnreleasedChanges:
          evaluatePackageReleaseGate(
            toGateSnapshot(pkg, componentVersions),
            latestRelease,
          ) === 'ready',
      });
    }

    return state;
  }
}

/**
 * The live version number of every component of the space, by family.
 *
 * A component absent from its map has no version this read can see — it was
 * deleted, or it never belonged to this space — which the gate reads as "no
 * version", the same thing an unresolved component used to mean.
 */
type ComponentVersionLookup = {
  commandsById: Map<string, Command>;
  standardsById: Map<string, Standard>;
  skillsById: Map<string, Skill>;
};

/** Where one package stands against its own newest release. */
type PackageReleaseState = Pick<
  ActiveDistributedPackage,
  'latestReleaseVersion' | 'hasUnreleasedChanges'
>;

/**
 * What a package whose release state was not read reports.
 *
 * Covers both the package no destination pins — whose state is deliberately
 * never read — and the one that could not be resolved. Says "never released,
 * nothing unreleased", which is the reading that offers neither `Update` nor a
 * release: inventing either would send a reader after a button for a package
 * this read knows nothing about. A wildcard destination ignores both fields
 * anyway, measuring itself against the live package instead.
 */
const NEVER_RELEASED: PackageReleaseState = {
  latestReleaseVersion: null,
  hasUnreleasedChanges: false,
};

/** The package as the release gate sees it, at the versions the space read holds. */
function toGateSnapshot(
  pkg: Package,
  versions: ComponentVersionLookup,
): PackageGateSnapshot {
  const component = (
    byId: Map<string, { version: number }>,
    id: string,
  ): PackageComponentSnapshot => ({
    id,
    latestVersion: byId.get(id)?.version ?? null,
  });

  return {
    name: pkg.name,
    description: pkg.description,
    recipes: (pkg.recipes ?? []).map((id) =>
      component(versions.commandsById, id),
    ),
    standards: (pkg.standards ?? []).map((id) =>
      component(versions.standardsById, id),
    ),
    skills: (pkg.skills ?? []).map((id) => component(versions.skillsById, id)),
  };
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
  release: PackageReleaseState;
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
    release,
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
    lastDistributionError: row.lastDistributionError,
    versionSpec: row.versionSpec,
    latestReleaseVersion: release.latestReleaseVersion,
    hasUnreleasedChanges: release.hasUnreleasedChanges,
    deployedRecipes: packageDeployedCommands,
    // Same value under the command-named field the type also requires.
    deployedCommands: packageDeployedCommands,
    deployedStandards: packageDeployedStandards,
    deployedSkills: packageDeployedSkills,
    pendingRecipes: pendingCommands,
    // Same value under the command-named field the type also requires.
    pendingCommands,
    pendingStandards,
    pendingSkills,
  };
}

/**
 * The packages at least one destination is pinned to by an exact version.
 *
 * A package distributed to one pinned destination and ten wildcard ones is in
 * the set: the pinned one still needs measuring. A package nothing pins is
 * absent, and its release state is never read.
 */
function pinnedPackagesOf(rows: ActivePackageOperationRow[]): Set<PackageId> {
  const pinned = new Set<PackageId>();
  for (const row of rows) {
    if (parsePackageVersionSpec(row.versionSpec)?.kind === 'exact') {
      pinned.add(row.packageId);
    }
  }
  return pinned;
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
    // Same value under the command-named field the type also requires.
    command: recipe ?? syntheticCommand,
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
