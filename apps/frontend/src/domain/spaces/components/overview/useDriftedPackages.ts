import { useMemo } from 'react';
import type { PackageId } from '@packmind/types';
import { useListActiveDistributedPackagesBySpaceQuery } from '../../../deployments/api/queries/DeploymentsQueries';
import {
  buildPackageDriftOverview,
  packageBehindInstallCount,
  packageHasDrift,
} from '../../../deployments/components/redesign/selectors/buildPackageDriftOverview';
import { useCurrentSpace } from '../../hooks/useCurrentSpace';

export type DriftedPackageSummary = {
  id: PackageId;
  name: string;
  behindInstalls: number;
};

export type DriftedPackagesState = {
  driftedPackages: DriftedPackageSummary[];
  totalBehindInstalls: number;
  isReady: boolean;
};

export function useDriftedPackages(): DriftedPackagesState {
  const { spaceId, isReady } = useCurrentSpace();
  const { data, isLoading, isError } =
    useListActiveDistributedPackagesBySpaceQuery(spaceId);

  const driftedPackages = useMemo<DriftedPackageSummary[]>(() => {
    if (!data) return [];
    return buildPackageDriftOverview(data)
      .filter(packageHasDrift)
      .map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        behindInstalls: packageBehindInstallCount(pkg),
      }))
      .sort((a, b) => b.behindInstalls - a.behindInstalls);
  }, [data]);

  const totalBehindInstalls = driftedPackages.reduce(
    (sum, pkg) => sum + pkg.behindInstalls,
    0,
  );

  return {
    driftedPackages,
    totalBehindInstalls,
    isReady: isReady && !isLoading && !isError,
  };
}
