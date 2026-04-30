import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  ActiveDistributedPackagesByTarget,
  DistributionStatus,
  IAccountsPort,
  IListActiveDistributedPackagesBySpaceUseCase,
  ISpacesPort,
  ListActiveDistributedPackagesBySpaceCommand,
  ListActiveDistributedPackagesBySpaceResponse,
  PackageId,
  TargetId,
} from '@packmind/types';
import {
  IDistributionRepository,
  LatestPackageOperationRow,
} from '../../domain/repositories/IDistributionRepository';

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
    const rows =
      await this.distributionRepository.findLatestPackageOperationsBySpace(
        command.spaceId,
      );

    return projectActiveDistributedPackagesByTarget(rows);
  }
}

export function projectActiveDistributedPackagesByTarget(
  rows: LatestPackageOperationRow[],
): ActiveDistributedPackagesByTarget[] {
  const byTarget = new Map<TargetId, PackageId[]>();
  for (const row of rows) {
    const isActiveFromAdd =
      row.operation === 'add' && row.status !== DistributionStatus.failure;
    const isActiveFromFailedRemove =
      row.operation === 'remove' && row.status === DistributionStatus.failure;
    if (!isActiveFromAdd && !isActiveFromFailedRemove) continue;
    const list = byTarget.get(row.targetId) ?? [];
    list.push(row.packageId);
    byTarget.set(row.targetId, list);
  }
  return Array.from(byTarget, ([targetId, packageIds]) => ({
    targetId,
    packageIds,
  }));
}
