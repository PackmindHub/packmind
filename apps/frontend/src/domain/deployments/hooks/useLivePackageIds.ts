import { useMemo } from 'react';
import { PackageId } from '@packmind/types';
import { useAuthContext } from '../../accounts/hooks';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { useListPackagesBySpaceQuery } from '../api/queries/DeploymentsQueries';

/**
 * Ids of the packages that still exist in the current space, or `undefined`
 * until they are known. The distribution history keeps deleted packages, and a
 * link to one would open the wrong package.
 */
export const useLivePackageIds = (): ReadonlySet<PackageId> | undefined => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const { data } = useListPackagesBySpaceQuery(spaceId, organization?.id);

  return useMemo(
    () => (data ? new Set(data.packages.map((pkg) => pkg.id)) : undefined),
    [data],
  );
};
