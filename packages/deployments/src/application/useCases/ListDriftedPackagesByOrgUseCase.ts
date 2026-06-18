import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  DriftedPackageInfo,
  IAccountsPort,
  IListDriftedPackagesByOrgUseCase,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  ListDriftedPackagesByOrgCommand,
  ListDriftedPackagesByOrgResponse,
  OrganizationId,
  Package,
  PackageId,
  Space,
  TargetId,
} from '@packmind/types';
import {
  ActivePackageOperationRow,
  IDistributionRepository,
  OutdatedDeploymentsByTarget,
} from '../../domain/repositories/IDistributionRepository';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';

const origin = 'ListDriftedPackagesByOrgUseCase';

/**
 * Latest version number of each artifact (standard / recipe / skill) of the
 * organization, keyed by artifact id. Mirrors how the space overview resolves
 * drift: an artifact missing from the map is considered deleted, and a deployed
 * version lower than the latest is considered behind.
 */
type LatestArtifactVersions = {
  standards: Map<string, number>;
  recipes: Map<string, number>;
  skills: Map<string, number>;
};

export class ListDriftedPackagesByOrgUseCase
  extends AbstractMemberUseCase<
    ListDriftedPackagesByOrgCommand,
    ListDriftedPackagesByOrgResponse
  >
  implements IListDriftedPackagesByOrgUseCase
{
  constructor(
    private readonly spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly distributionRepository: IDistributionRepository,
    private readonly packageRepository: IPackageRepository,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly skillsPort: ISkillsPort,
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: ListDriftedPackagesByOrgCommand & MemberContext,
  ): Promise<ListDriftedPackagesByOrgResponse> {
    const organizationId = command.organization.id;

    const spaces =
      await this.spacesPort.listSpacesByOrganization(organizationId);

    if (spaces.length === 0) {
      return [];
    }

    const latestVersions =
      await this.loadLatestArtifactVersions(organizationId);

    const perSpace = await Promise.all(
      spaces.map((space) =>
        this.collectSpaceDrift(space, organizationId, latestVersions),
      ),
    );

    return perSpace.flat().sort((a, b) => {
      if (b.behindDistributions !== a.behindDistributions) {
        return b.behindDistributions - a.behindDistributions;
      }
      return a.packageName.localeCompare(b.packageName);
    });
  }

  private async loadLatestArtifactVersions(
    organizationId: OrganizationId,
  ): Promise<LatestArtifactVersions> {
    const [standards, recipes, skills] = await Promise.all([
      this.standardsPort.listAllStandardsByOrganization(organizationId),
      this.recipesPort.listAllRecipesByOrganization(organizationId),
      this.skillsPort.listAllSkillsByOrganization(organizationId),
    ]);

    return {
      standards: new Map(standards.map((s) => [s.id as string, s.version])),
      recipes: new Map(recipes.map((r) => [r.id as string, r.version])),
      skills: new Map(skills.map((s) => [s.id as string, s.version])),
    };
  }

  private async collectSpaceDrift(
    space: Space,
    organizationId: OrganizationId,
    latestVersions: LatestArtifactVersions,
  ): Promise<DriftedPackageInfo[]> {
    const [outdatedByTarget, activeOps, packages] = await Promise.all([
      this.distributionRepository.findOutdatedDeploymentsBySpace(
        organizationId,
        space.id,
      ),
      this.distributionRepository.findActivePackageOperationsBySpace(space.id),
      this.packageRepository.findBySpaceId(space.id),
    ]);

    if (activeOps.length === 0 || packages.length === 0) {
      return [];
    }

    const packagesById = new Map<PackageId, Package>(
      packages.map((p) => [p.id, p]),
    );
    const lastDistByPackage = computeLastDistributedAt(activeOps);
    const driftedTargetsByPackage = computeDriftedTargets(
      outdatedByTarget,
      activeOps,
      packagesById,
      latestVersions,
    );

    const results: DriftedPackageInfo[] = [];
    for (const [packageId, driftedTargets] of driftedTargetsByPackage) {
      if (driftedTargets.size === 0) continue;
      const pkg = packagesById.get(packageId);
      if (!pkg) continue;
      results.push({
        packageId,
        packageName: pkg.name,
        spaceId: space.id,
        spaceSlug: space.slug,
        spaceName: space.name,
        behindDistributions: driftedTargets.size,
        lastUpdatedAt: lastDistByPackage.get(packageId) ?? null,
      });
    }
    return results;
  }
}

function computeLastDistributedAt(
  activeOps: ReadonlyArray<ActivePackageOperationRow>,
): Map<PackageId, string> {
  const lastByPackage = new Map<PackageId, string>();
  for (const op of activeOps) {
    const existing = lastByPackage.get(op.packageId);
    if (!existing || op.lastDistributedAt > existing) {
      lastByPackage.set(op.packageId, op.lastDistributedAt);
    }
  }
  return lastByPackage;
}

/**
 * A deployed artifact is in drift when it has been deleted from Packmind
 * (no current version, i.e. it still needs to be removed from the target) or
 * when its deployed version is behind the latest version. This matches the
 * drift determination used by the space overview.
 */
function isDeployedArtifactDrifted(
  deployedVersion: number,
  latestVersion: number | undefined,
): boolean {
  if (latestVersion === undefined) return true;
  return deployedVersion < latestVersion;
}

function computeDriftedTargets(
  outdatedByTarget: OutdatedDeploymentsByTarget[],
  activeOps: ReadonlyArray<ActivePackageOperationRow>,
  packagesById: Map<PackageId, Package>,
  latestVersions: LatestArtifactVersions,
): Map<PackageId, Set<TargetId>> {
  const opsByTarget = new Map<TargetId, PackageId[]>();
  for (const op of activeOps) {
    const list = opsByTarget.get(op.targetId);
    if (list) {
      list.push(op.packageId);
    } else {
      opsByTarget.set(op.targetId, [op.packageId]);
    }
  }

  const driftedTargetsByPackage = new Map<PackageId, Set<TargetId>>();
  for (const outdated of outdatedByTarget) {
    const packageIdsOnTarget = opsByTarget.get(outdated.targetId);
    if (!packageIdsOnTarget?.length) continue;

    const driftedStandardIds = new Set(
      outdated.standards
        .filter((s) =>
          isDeployedArtifactDrifted(
            s.deployedVersion,
            latestVersions.standards.get(s.artifactId as string),
          ),
        )
        .map((s) => s.artifactId as string),
    );
    const driftedRecipeIds = new Set(
      outdated.recipes
        .filter((r) =>
          isDeployedArtifactDrifted(
            r.deployedVersion,
            latestVersions.recipes.get(r.artifactId as string),
          ),
        )
        .map((r) => r.artifactId as string),
    );
    const driftedSkillIds = new Set(
      outdated.skills
        .filter((s) =>
          isDeployedArtifactDrifted(
            s.deployedVersion,
            latestVersions.skills.get(s.artifactId as string),
          ),
        )
        .map((s) => s.artifactId as string),
    );

    for (const packageId of packageIdsOnTarget) {
      const pkg = packagesById.get(packageId);
      if (!pkg) continue;
      const hasDrift =
        pkg.standards.some((id) => driftedStandardIds.has(id)) ||
        pkg.recipes.some((id) => driftedRecipeIds.has(id)) ||
        pkg.skills.some((id) => driftedSkillIds.has(id));
      if (!hasDrift) continue;

      let bucket = driftedTargetsByPackage.get(packageId);
      if (!bucket) {
        bucket = new Set();
        driftedTargetsByPackage.set(packageId, bucket);
      }
      bucket.add(outdated.targetId);
    }
  }
  return driftedTargetsByPackage;
}
