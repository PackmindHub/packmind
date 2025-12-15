import {
  Distribution,
  DistributionStatus,
  Target,
  GitRepo,
  PackagesDeployment,
  RemovePackageFromTargetsResult,
} from '@packmind/types';

// Extended target type that includes the joined gitRepo from TypeORM queries
type TargetWithGitRepo = Target & {
  gitRepo?: GitRepo;
};

export interface DeploymentNotificationResult {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description: string;
}

export interface DeploymentAnalysis {
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  noChangesDeployments: number;
  // Count packages deployed
  successfulPackages: number;
  failedPackages: number;
  noChangesPackages: number;
  failedTargets: Array<{
    name: string;
    path: string;
    repositoryInfo: string;
    error?: string;
  }>;
}

/**
 * Analyzes deployment results from both recipes and standards distributions
 * and returns appropriate notification data
 */
export function analyzeDeploymentResults(
  recipesDistributions: Distribution[] = [],
  standardsDistributions: Distribution[] = [],
): DeploymentNotificationResult {
  const allDeployments = [...recipesDistributions, ...standardsDistributions];

  if (allDeployments.length === 0) {
    return {
      type: 'error',
      title: 'No deployments found',
      description: 'No deployments were created. Please try again.',
    };
  }

  const analysis = getDeploymentAnalysis(allDeployments);

  // Helper to format description with optional target count
  const formatWithTargets = (
    packageCount: number,
    targetCount: number,
    action: string,
  ): string => {
    if (targetCount > 1) {
      return `${packageCount} package(s) ${action} to ${targetCount} target(s).`;
    }
    return `${packageCount} package(s) ${action}.`;
  };

  // All no changes (already distributed)
  if (
    analysis.successfulDeployments === 0 &&
    analysis.failedDeployments === 0 &&
    analysis.noChangesDeployments > 0
  ) {
    return {
      type: 'info',
      title: 'Already distributed',
      description: formatWithTargets(
        analysis.noChangesPackages,
        analysis.noChangesDeployments,
        'already up-to-date',
      ),
    };
  }

  // All successful (including no_changes as successful)
  if (analysis.failedDeployments === 0) {
    if (
      analysis.noChangesDeployments > 0 &&
      analysis.successfulDeployments === 0
    ) {
      // Already handled above
      return {
        type: 'info',
        title: 'Already distributed',
        description: formatWithTargets(
          analysis.noChangesPackages,
          analysis.noChangesDeployments,
          'already up-to-date',
        ),
      };
    }
    if (analysis.noChangesDeployments > 0) {
      // Mixed success and no_changes
      const successDesc = formatWithTargets(
        analysis.successfulPackages,
        analysis.successfulDeployments,
        'distributed successfully',
      );
      return {
        type: 'success',
        title: 'Distribution completed',
        description: `${successDesc} ${analysis.noChangesPackages} package(s) already up-to-date.`,
      };
    }
    return {
      type: 'success',
      title: 'Distribution completed successfully',
      description: formatWithTargets(
        analysis.successfulPackages,
        analysis.successfulDeployments,
        'distributed successfully',
      ),
    };
  }

  // All failed
  if (
    analysis.successfulDeployments === 0 &&
    analysis.noChangesDeployments === 0
  ) {
    const failedTargetsList = analysis.failedTargets
      .map(
        (target) =>
          `• ${target.path} in ${target.repositoryInfo}${target.error ? ` - ${target.error}` : ''}`,
      )
      .join('\n');

    return {
      type: 'error',
      title: 'All distributions failed',
      description: `${analysis.failedPackages} package(s) failed to distribute:\n${failedTargetsList}`,
    };
  }

  // Mixed results (success, no_changes, and/or failures)
  const failedTargetsList = analysis.failedTargets
    .map((target) => `• ${target.path} in ${target.repositoryInfo}`)
    .join('\n');

  const successPackages =
    analysis.successfulPackages + analysis.noChangesPackages;
  const successTargets =
    analysis.successfulDeployments + analysis.noChangesDeployments;
  return {
    type: 'warning',
    title: 'Partial deployment completed',
    description: `${successPackages} of ${successPackages + analysis.failedPackages} package(s) successful${successTargets > 1 ? ` to ${successTargets} target(s)` : ''}${analysis.noChangesPackages > 0 ? ` (${analysis.noChangesPackages} already up-to-date)` : ''}. Failed targets:\n${failedTargetsList}`,
  };
}

/**
 * Analyzes an array of distributions and returns statistics
 */
function getDeploymentAnalysis(
  deployments: Distribution[],
): DeploymentAnalysis {
  const totalDeployments = deployments.length;
  const successfulDeployments = deployments.filter(
    (d) => d.status === DistributionStatus.success,
  ).length;
  const failedDeployments = deployments.filter(
    (d) => d.status === DistributionStatus.failure,
  ).length;
  const noChangesDeployments = deployments.filter(
    (d) => d.status === DistributionStatus.no_changes,
  ).length;

  // Count packages deployed
  const countPackages = (d: Distribution): number => {
    if ('distributedPackages' in d) {
      return d.distributedPackages.length;
    }
    return 0;
  };

  const successfulPackages = deployments
    .filter((d) => d.status === DistributionStatus.success)
    .reduce((count, d) => count + countPackages(d), 0);

  const failedPackages = deployments
    .filter((d) => d.status === DistributionStatus.failure)
    .reduce((count, d) => count + countPackages(d), 0);

  const noChangesPackages = deployments
    .filter((d) => d.status === DistributionStatus.no_changes)
    .reduce((count, d) => count + countPackages(d), 0);

  const failedTargets = deployments
    .filter((d) => d.status === DistributionStatus.failure)
    .map((d) => {
      // Try to get repository information from the target
      const target = d.target as TargetWithGitRepo;
      const gitRepo = target.gitRepo;

      // Extract repository info from error message if available
      let repositoryInfo = gitRepo
        ? `${gitRepo.owner}/${gitRepo.repo}:${gitRepo.branch}`
        : 'repository';

      // Try to extract repository name from error message as fallback
      if (!gitRepo && d.error) {
        const repoMatch = d.error.match(
          /([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*)/,
        );
        if (repoMatch) {
          repositoryInfo = repoMatch[1];
        }
      }

      return {
        name: d.target.name,
        path: d.target.path,
        repositoryInfo,
        error: d.error,
      };
    });

  return {
    totalDeployments,
    successfulDeployments,
    failedDeployments,
    noChangesDeployments,
    successfulPackages,
    failedPackages,
    noChangesPackages,
    failedTargets,
  };
}

/**
 * Creates a detailed breakdown of what was distributed
 */
/**
 * Creates separate notifications for each deployment status type
 * Returns an array of notifications to be displayed individually
 */
export function createSeparateDeploymentNotifications(
  recipesDistributions: Distribution[] = [],
  standardsDistributions: Distribution[] = [],
): DeploymentNotificationResult[] {
  const allDeployments = [...recipesDistributions, ...standardsDistributions];

  if (allDeployments.length === 0) {
    return [
      {
        type: 'error',
        title: 'No deployments found',
        description: 'No deployments were created. Please try again.',
      },
    ];
  }

  const analysis = getDeploymentAnalysis(allDeployments);
  const notifications: DeploymentNotificationResult[] = [];

  // Helper to format description with optional target count
  const formatDescription = (
    packageCount: number,
    targetCount: number,
    action: string,
  ): string => {
    if (targetCount > 1) {
      return `${packageCount} package(s) ${action} to ${targetCount} target(s).`;
    }
    return `${packageCount} package(s) ${action}.`;
  };

  // Success notifications
  if (analysis.successfulPackages > 0) {
    notifications.push({
      type: 'success',
      title: 'Distribution completed successfully',
      description: formatDescription(
        analysis.successfulPackages,
        analysis.successfulDeployments,
        'distributed successfully',
      ),
    });
  }

  // No changes notifications
  if (analysis.noChangesPackages > 0) {
    notifications.push({
      type: 'info',
      title: 'Already distributed',
      description: formatDescription(
        analysis.noChangesPackages,
        analysis.noChangesDeployments,
        'already up-to-date - no changes needed',
      ),
    });
  }

  // Failure notifications
  if (analysis.failedPackages > 0) {
    const failedTargetsList = analysis.failedTargets
      .map(
        (target) =>
          `• ${target.path} in ${target.repositoryInfo}${target.error ? ` - ${target.error}` : ''}`,
      )
      .join('\n');

    notifications.push({
      type: 'error',
      title: 'Deployment failed',
      description: `${analysis.failedPackages} package(s) failed to deploy:\n${failedTargetsList}`,
    });
  }

  return notifications;
}

export function createDeploymentSummary(
  recipesDistributions: Distribution[] = [],
  standardsDistributions: Distribution[] = [],
): string {
  const parts: string[] = [];

  if (recipesDistributions.length > 0) {
    const recipeNames = [
      ...new Set(
        recipesDistributions.flatMap((d) =>
          d.distributedPackages.flatMap(
            (dp) =>
              dp.recipeVersions?.map((rv: { name: string }) => rv.name) || [],
          ),
        ),
      ),
    ];
    if (recipeNames.length > 0) {
      parts.push(`${recipeNames.length} recipe(s): ${recipeNames.join(', ')}`);
    }
  }

  if (standardsDistributions.length > 0) {
    const standardNames = [
      ...new Set(
        standardsDistributions.flatMap((d) =>
          d.distributedPackages.flatMap(
            (dp) => dp.standardVersions?.map((sv) => sv.name) || [],
          ),
        ),
      ),
    ];
    if (standardNames.length > 0) {
      parts.push(
        `${standardNames.length} standard(s): ${standardNames.join(', ')}`,
      );
    }
  }

  return parts.join(' | ');
}

/**
 * Creates notifications for package deployment results
 * Handles success, no_changes, and failure statuses
 */
export function createPackagesDeploymentNotifications(
  deployments: PackagesDeployment[],
): DeploymentNotificationResult[] {
  if (deployments.length === 0) {
    return [
      {
        type: 'error',
        title: 'No deployments found',
        description: 'No deployments were created. Please try again.',
      },
    ];
  }

  const successfulDeployments = deployments.filter(
    (d) => d.status === DistributionStatus.success,
  );
  const failedDeployments = deployments.filter(
    (d) => d.status === DistributionStatus.failure,
  );
  const noChangesDeployments = deployments.filter(
    (d) => d.status === DistributionStatus.no_changes,
  );

  // Count unique packages across deployments
  const countPackages = (deps: PackagesDeployment[]): number => {
    const uniquePackageIds = new Set(
      deps.flatMap((d) => d.packages.map((p) => p.id)),
    );
    return uniquePackageIds.size;
  };

  const successfulPackages = countPackages(successfulDeployments);
  const failedPackages = countPackages(failedDeployments);
  const noChangesPackages = countPackages(noChangesDeployments);

  // Helper to format description with optional target count
  const formatDescription = (
    packageCount: number,
    targetCount: number,
    action: string,
  ): string => {
    if (targetCount > 1) {
      return `${packageCount} package(s) ${action} to ${targetCount} target(s).`;
    }
    return `${packageCount} package(s) ${action}.`;
  };

  const notifications: DeploymentNotificationResult[] = [];

  // Success notifications
  if (successfulPackages > 0) {
    notifications.push({
      type: 'success',
      title: 'Distribution completed successfully',
      description: formatDescription(
        successfulPackages,
        successfulDeployments.length,
        'distributed successfully',
      ),
    });
  }

  // No changes notifications
  if (noChangesPackages > 0) {
    notifications.push({
      type: 'info',
      title: 'Already distributed',
      description: formatDescription(
        noChangesPackages,
        noChangesDeployments.length,
        'already up-to-date - no changes needed',
      ),
    });
  }

  // Failure notifications
  if (failedPackages > 0) {
    const failedTargetsList = failedDeployments
      .map((d) => {
        const target = d.target as TargetWithGitRepo;
        const gitRepo = target.gitRepo;
        const repositoryInfo = gitRepo
          ? `${gitRepo.owner}/${gitRepo.repo}:${gitRepo.branch}`
          : 'repository';
        return `• ${d.target.path} in ${repositoryInfo}${d.error ? ` - ${d.error}` : ''}`;
      })
      .join('\n');

    notifications.push({
      type: 'error',
      title: 'Deployment failed',
      description: `${failedPackages} package(s) failed to deploy:\n${failedTargetsList}`,
    });
  }

  return notifications;
}

/**
 * Creates notifications for package removal results
 * Handles success and failure statuses
 */
export function createPackageRemovalNotifications(
  results: RemovePackageFromTargetsResult[],
  packageName: string,
): DeploymentNotificationResult[] {
  const successfulRemovals = results.filter((r) => r.success);
  const failedRemovals = results.filter((r) => !r.success);
  const notifications: DeploymentNotificationResult[] = [];

  if (successfulRemovals.length > 0) {
    notifications.push({
      type: 'success',
      title: 'Removal completed',
      description: `"${packageName}" removed from ${successfulRemovals.length} target(s).`,
    });
  }

  if (failedRemovals.length > 0) {
    notifications.push({
      type: 'error',
      title: 'Some removals failed',
      description: `Failed to remove from ${failedRemovals.length} target(s).`,
    });
  }

  return notifications;
}
