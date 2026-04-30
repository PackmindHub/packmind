import { useCallback, useMemo } from 'react';
import { PackageId, SpaceId, TargetId } from '@packmind/types';
import { useListActiveDistributedPackagesBySpaceQuery } from '../api/queries/DeploymentsQueries';

const EMPTY_PACKAGE_IDS: ReadonlySet<PackageId> = new Set<PackageId>();

export function useActivePackageIdsByTarget(spaceId: SpaceId | undefined) {
  const { data } = useListActiveDistributedPackagesBySpaceQuery(spaceId);

  const byTarget = useMemo(() => {
    const map = new Map<TargetId, ReadonlySet<PackageId>>();
    data?.forEach((entry) => {
      map.set(entry.targetId, new Set(entry.packages.map((p) => p.packageId)));
    });
    return map;
  }, [data]);

  const getActivePackageIds = useCallback(
    (targetId: TargetId): ReadonlySet<PackageId> =>
      byTarget.get(targetId) ?? EMPTY_PACKAGE_IDS,
    [byTarget],
  );

  return { getActivePackageIds };
}
