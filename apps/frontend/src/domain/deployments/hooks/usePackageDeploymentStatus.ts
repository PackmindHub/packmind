import { useCallback, useMemo } from 'react';
import {
  ActiveDistributedPackagesByTarget,
  PackageId,
  SpaceId,
} from '@packmind/types';
import { useListActiveDistributedPackagesBySpaceQuery } from '../api/queries/DeploymentsQueries';

/**
 * Counts the number of distinct targets each package is currently live on,
 * derived from the space-wide active-distribution overview. Keyed by the
 * stringified package id so callers can look up any package in one pass.
 */
export function getDeployedTargetCountByPackage(
  activeByTarget: ActiveDistributedPackagesByTarget[] | undefined,
): Map<string, number> {
  const targetIdsByPackage = new Map<string, Set<string>>();

  if (!activeByTarget) return new Map();

  for (const targetEntry of activeByTarget) {
    for (const pkg of targetEntry.packages) {
      const key = pkg.packageId.toString();
      const targets = targetIdsByPackage.get(key) ?? new Set<string>();
      targets.add(targetEntry.targetId.toString());
      targetIdsByPackage.set(key, targets);
    }
  }

  const counts = new Map<string, number>();
  for (const [key, targets] of targetIdsByPackage) {
    counts.set(key, targets.size);
  }
  return counts;
}

/**
 * Exposes per-package deployment status for a space in a single query. Drives
 * the removal-confirmation warning: removing an artifact from a deployed
 * package (deployedTargets > 0) keeps shipping until the next sync.
 */
export function usePackageDeploymentStatus(spaceId: SpaceId | undefined) {
  const { data, isLoading, isError } =
    useListActiveDistributedPackagesBySpaceQuery(spaceId);

  const deployedTargetsByPackageId = useMemo(
    () => getDeployedTargetCountByPackage(data),
    [data],
  );

  const getDeployedTargets = useCallback(
    (packageId: PackageId | string | undefined): number => {
      if (!packageId) return 0;
      return deployedTargetsByPackageId.get(packageId.toString()) ?? 0;
    },
    [deployedTargetsByPackageId],
  );

  return {
    deployedTargetsByPackageId,
    getDeployedTargets,
    isLoading,
    isError,
  };
}
