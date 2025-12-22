import {
  Distribution,
  DistributionStatus,
  PackageId,
  TargetId,
} from '@packmind/types';

/**
 * Filters distributions to only return those for targets where the specified
 * package is currently deployed.
 *
 * For each target, it finds the most recent distribution containing the package
 * and determines if the package is actively deployed based on:
 * - 'add' operation with success/no_changes → deployed
 * - 'add' operation with failure → not deployed (failed to add)
 * - 'remove' operation with success/no_changes → not deployed (removed)
 * - 'remove' operation with failure → still deployed (failed to remove)
 *
 * @param distributions - List of distributions
 * @param packageId - The ID of the package to check
 * @returns Only distributions for targets where the package is actively deployed
 */
export function listActiveDistributions(
  distributions: Distribution[],
  packageId: PackageId,
): Distribution[] {
  if (distributions.length === 0) {
    return [];
  }

  // Filter distributions that contain the specified package
  const distributionsWithPackage = distributions.filter((d) =>
    d.distributedPackages.some((dp) => dp.packageId === packageId),
  );

  if (distributionsWithPackage.length === 0) {
    return [];
  }

  // Group distributions by target ID
  const distributionsByTarget = new Map<TargetId, Distribution[]>();

  for (const distribution of distributionsWithPackage) {
    const targetId = distribution.target.id;
    const existing = distributionsByTarget.get(targetId) ?? [];
    existing.push(distribution);
    distributionsByTarget.set(targetId, existing);
  }

  const activeDistributions: Distribution[] = [];

  // For each target, find the latest distribution and check its operation and status
  for (const targetDistributions of distributionsByTarget.values()) {
    // Sort by createdAt descending to get the latest first
    const sorted = [...targetDistributions].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const latestDistribution = sorted[0];
    const status = latestDistribution.status;

    // Get the distributed package entry for this specific package
    const packageEntry = latestDistribution.distributedPackages.find(
      (dp) => dp.packageId === packageId,
    );

    if (!packageEntry) {
      continue;
    }

    const operation = packageEntry.operation;

    // Package is actively deployed if:
    // - Last operation was 'add' and it succeeded (success or no_changes)
    // - Last operation was 'remove' but it failed (package still there)
    const isActiveFromAdd =
      operation === 'add' && status !== DistributionStatus.failure;
    const isActiveFromFailedRemove =
      operation === 'remove' && status === DistributionStatus.failure;

    if (isActiveFromAdd || isActiveFromFailedRemove) {
      activeDistributions.push(latestDistribution);
    }
  }

  return activeDistributions;
}
