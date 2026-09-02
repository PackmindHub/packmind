import { useMemo } from 'react';
import type { PackageId } from '@packmind/types';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useListActiveDistributedPackagesBySpaceQuery } from '../../api/queries/DeploymentsQueries';
import { buildPackageDriftOverview } from '../redesign/selectors/buildPackageDriftOverview';
import type { PackageDrift } from '../redesign/types';

export type SpaceDrift = {
  /** Every package of the space that has landed somewhere. */
  packages: PackageDrift[];
  isLoading: boolean;
  isError: boolean;
};

/**
 * Where the packages of the space have landed, and what is stale there.
 *
 * The query is space-wide because that is the endpoint that exists, and sharing
 * it is the point: the tab badge, the tab body, the marks the rail puts on its
 * rows and the Distribution entry in the navigation all read the same cache
 * entry, so they cannot end up showing different numbers for the same package.
 */
export function useSpaceDrift(): SpaceDrift {
  const { spaceId } = useCurrentSpace();
  const { data, isLoading, isError } =
    useListActiveDistributedPackagesBySpaceQuery(spaceId);

  const packages = useMemo(
    () => (data ? buildPackageDriftOverview(data) : []),
    [data],
  );

  return { packages, isLoading, isError };
}

/**
 * The same answer, narrowed to one package.
 *
 * A package that was never distributed anywhere is absent from the result, so
 * `drift` is null for it. That is not an error state, and the difference from
 * "still loading" is what `isLoading` is for.
 */
export function usePackageDrift(
  packageId: PackageId | null,
): SpaceDrift & { drift: PackageDrift | null } {
  const { packages, isLoading, isError } = useSpaceDrift();

  const drift = useMemo(
    () => packages.find((pkg) => pkg.id === packageId) ?? null,
    [packages, packageId],
  );

  return { drift, packages, isLoading, isError };
}
