import { useCallback, useMemo } from 'react';
import {
  ActiveDistributedPackagesByTarget,
  OrganizationId,
  PackageId,
  SpaceId,
} from '@packmind/types';
import { usePackageMarketplaceStatus } from '@packmind/proprietary/frontend/domain/marketplaces/hooks/usePackageMarketplaceStatus';
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
 * Exposes per-package deployment status for a space. A package counts as
 * deployed when it is live on a repo target or published to a marketplace
 * (edition-gated: the OSS stub always reports zero marketplaces).
 */
export function usePackageDeploymentStatus(
  spaceId: SpaceId | undefined,
  organizationId?: OrganizationId | string,
) {
  const { data, isLoading, isError } =
    useListActiveDistributedPackagesBySpaceQuery(spaceId);
  const { getPublishedMarketplaces } =
    usePackageMarketplaceStatus(organizationId);

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

  const isDeployed = useCallback(
    (packageId: PackageId | string | undefined): boolean =>
      getDeployedTargets(packageId) > 0 ||
      getPublishedMarketplaces(packageId) > 0,
    [getDeployedTargets, getPublishedMarketplaces],
  );

  return {
    deployedTargetsByPackageId,
    getDeployedTargets,
    getDeployedMarketplaces: getPublishedMarketplaces,
    isDeployed,
    isLoading,
    isError,
  };
}
