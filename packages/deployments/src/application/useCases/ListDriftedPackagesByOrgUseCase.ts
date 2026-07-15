import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  DriftedPackageInfo,
  IAccountsPort,
  IListDriftedPackagesByOrgUseCase,
  ISpacesPort,
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

    const perSpace = await Promise.all(
      spaces.map((space) => this.collectSpaceDrift(space, organizationId)),
    );

    return perSpace.flat().sort((a, b) => {
      if (b.behindDistributions !== a.behindDistributions) {
        return b.behindDistributions - a.behindDistributions;
      }
      return a.packageName.localeCompare(b.packageName);
    });
  }

  private async collectSpaceDrift(
    space: Space,
    organizationId: OrganizationId,
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

function computeDriftedTargets(
  outdatedByTarget: OutdatedDeploymentsByTarget[],
  activeOps: ReadonlyArray<ActivePackageOperationRow>,
  packagesById: Map<PackageId, Package>,
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

    const outdatedStandardIds = new Set(
      outdated.standards.map((s) => s.artifactId as string),
    );
    const outdatedCommandIds = new Set(
      outdated.recipes.map((r) => r.artifactId as string),
    );
    const outdatedSkillIds = new Set(
      outdated.skills.map((s) => s.artifactId as string),
    );

    for (const packageId of packageIdsOnTarget) {
      const pkg = packagesById.get(packageId);
      if (!pkg) continue;
      const hasDrift =
        pkg.standards.some((id) => outdatedStandardIds.has(id)) ||
        pkg.recipes.some((id) => outdatedCommandIds.has(id)) ||
        pkg.skills.some((id) => outdatedSkillIds.has(id));
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
