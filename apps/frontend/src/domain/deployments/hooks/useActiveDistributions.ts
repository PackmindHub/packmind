import { useMemo } from 'react';
import { DistributionHistoryEntry, PackageId } from '@packmind/types';
import { listActiveDistributions } from '../utils/listActiveDistributions';
import { isOnLiveTarget, useLiveTargetIds } from './useLiveTargetIds';

/**
 * The history keeps targets that were deleted since, so a distribution can
 * look active while its target is gone. Distributions on a target that no
 * longer exists are dropped once the live targets are known.
 */
export const useActiveDistributions = <D extends DistributionHistoryEntry>(
  distributions: D[],
  packageId: PackageId,
): D[] => {
  const liveTargetIds = useLiveTargetIds();

  return useMemo(
    () =>
      listActiveDistributions(distributions, packageId).filter((d) =>
        isOnLiveTarget(d, liveTargetIds),
      ),
    [distributions, packageId, liveTargetIds],
  );
};
