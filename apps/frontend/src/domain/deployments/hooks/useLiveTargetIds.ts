import { useMemo } from 'react';
import { TargetId } from '@packmind/types';
import { useGetTargetsByOrganizationQuery } from '../api/queries/DeploymentsQueries';

/**
 * Ids of the targets that still exist, or `undefined` until they are known.
 * The distribution history keeps targets deleted since.
 */
export const useLiveTargetIds = (): ReadonlySet<TargetId> | undefined => {
  const { data } = useGetTargetsByOrganizationQuery();

  return useMemo(
    () => (data ? new Set(data.map((target) => target.id)) : undefined),
    [data],
  );
};

/** Unknown live targets count as live, so nothing is hidden while loading. */
export const isOnLiveTarget = (
  distribution: { target: { id: TargetId } },
  liveTargetIds: ReadonlySet<TargetId> | undefined,
): boolean => !liveTargetIds || liveTargetIds.has(distribution.target.id);
