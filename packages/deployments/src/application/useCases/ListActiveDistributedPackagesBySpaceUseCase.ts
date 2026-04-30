import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  ActiveDistributedPackagesByTarget,
  Distribution,
  DistributionStatus,
  IAccountsPort,
  IListActiveDistributedPackagesBySpaceUseCase,
  ISpacesPort,
  ListActiveDistributedPackagesBySpaceCommand,
  ListActiveDistributedPackagesBySpaceResponse,
  PackageId,
  TargetId,
} from '@packmind/types';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';

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
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsAdapter, logger);
  }

  async executeForSpaceMembers(
    command: ListActiveDistributedPackagesBySpaceCommand & SpaceMemberContext,
  ): Promise<ListActiveDistributedPackagesBySpaceResponse> {
    const distributions = await this.distributionRepository.findBySpaceId(
      command.spaceId,
    );

    return projectActiveDistributedPackagesByTarget(distributions);
  }
}

export function projectActiveDistributedPackagesByTarget(
  distributions: Distribution[],
): ActiveDistributedPackagesByTarget[] {
  // Group every (target, package) pair to its distributions.
  const pairs = new Map<
    string,
    { distributions: Distribution[]; targetId: TargetId; packageId: PackageId }
  >();
  for (const d of distributions) {
    const targetId = d.target.id;
    for (const dp of d.distributedPackages) {
      const key = `${targetId}::${dp.packageId}`;
      const existing = pairs.get(key);
      if (existing) {
        existing.distributions.push(d);
      } else {
        pairs.set(key, {
          distributions: [d],
          targetId,
          packageId: dp.packageId as PackageId,
        });
      }
    }
  }

  // Per (target, package): take the latest distribution by createdAt;
  // include iff (operation === 'add' && status !== failure) || (operation === 'remove' && status === failure).
  const byTarget = new Map<TargetId, Set<PackageId>>();
  for (const { distributions: ds, targetId, packageId } of pairs.values()) {
    const sorted = [...ds].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const latest = sorted[0];
    const status = latest.status;
    const dp = latest.distributedPackages.find(
      (p) => p.packageId === packageId,
    );
    if (!dp) continue;
    const op = dp.operation;
    const isActiveFromAdd =
      op === 'add' && status !== DistributionStatus.failure;
    const isActiveFromFailedRemove =
      op === 'remove' && status === DistributionStatus.failure;
    if (!(isActiveFromAdd || isActiveFromFailedRemove)) continue;
    const set = byTarget.get(targetId) ?? new Set<PackageId>();
    set.add(packageId);
    byTarget.set(targetId, set);
  }

  return Array.from(byTarget.entries()).map(([targetId, set]) => ({
    targetId,
    packageIds: Array.from(set),
  }));
}
