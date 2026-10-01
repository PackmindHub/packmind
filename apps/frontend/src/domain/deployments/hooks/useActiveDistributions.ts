import { useMemo } from 'react';
import { DistributionHistoryEntry, PackageId } from '@packmind/types';
import { useGetTargetsByOrganizationQuery } from '../api/queries/DeploymentsQueries';
import { listActiveDistributions } from '../utils/listActiveDistributions';

/**
 * The history keeps targets that were deleted since, so a distribution can
 * look active while its target is gone. Distributions on a target that no
 * longer exists are dropped once the live targets are known.
 */
export const useActiveDistributions = <D extends DistributionHistoryEntry>(
  distributions: D[],
  packageId: PackageId,
): D[] => {
  const { data: liveTargets } = useGetTargetsByOrganizationQuery();

  return useMemo(() => {
    const active = listActiveDistributions(distributions, packageId);
    if (!liveTargets) return active;

    const liveTargetIds = new Set(liveTargets.map((target) => target.id));
    return active.filter((d) => liveTargetIds.has(d.target.id));
  }, [distributions, packageId, liveTargets]);
};
