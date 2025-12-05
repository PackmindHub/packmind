import {
  Distribution,
  DistributionStatus,
  Target,
  GitRepo,
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
  // New: count actual items (standards/recipes) instead of just deployment records
  successfulItems: number;
  failedItems: number;
  noChangesItems: number;
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

  // All no changes (already distributed)
  if (
    analysis.successfulDeployments === 0 &&
    analysis.failedDeployments === 0 &&
    analysis.noChangesDeployments > 0
  ) {
    return {
      type: 'info',
      title: 'Already distributed',
      description: `The version of ${analysis.noChangesDeployments === 1 ? 'this standard/recipe is' : 'these standards/recipes are'} already distributed on ${analysis.noChangesDeployments === 1 ? 'this target' : 'these targets'}.`,
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
        description: `The version of ${analysis.noChangesDeployments === 1 ? 'this standard/recipe is' : 'these standards/recipes are'} already distributed on ${analysis.noChangesDeployments === 1 ? 'this target' : 'these targets'}.`,
      };
    }
    if (analysis.noChangesDeployments > 0) {
      // Mixed success and no_changes
      return {
        type: 'success',
        title: 'Distribution completed',
        description: `${analysis.successfulDeployments} deployment(s) completed successfully. ${analysis.noChangesDeployments} already up-to-date.`,
      };
    }
    return {
      type: 'success',
      title: 'Distribution completed successfully',
      description: `All ${analysis.totalDeployments} deployment(s) completed successfully.`,
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
      description: `All ${analysis.totalDeployments} distribution(s) failed:\n${failedTargetsList}`,
    };
  }

  // Mixed results (success, no_changes, and/or failures)
  const failedTargetsList = analysis.failedTargets
    .map((target) => `• ${target.path} in ${target.repositoryInfo}`)
    .join('\n');

  const successCount =
    analysis.successfulDeployments + analysis.noChangesDeployments;
  return {
    type: 'warning',
    title: 'Partial deployment completed',
    description: `${successCount} of ${analysis.totalDeployments} deployment(s) successful${analysis.noChangesDeployments > 0 ? ` (${analysis.noChangesDeployments} already up-to-date)` : ''}. Failed targets:\n${failedTargetsList}`,
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

  // Count actual items (standards/recipes) instead of just deployment records
  const countItems = (d: Distribution): number => {
    if ('distributedPackages' in d) {
      // For Distribution, count standard versions and recipe versions across all distributed packages
      return d.distributedPackages.reduce(
        (sum: number, dp: Distribution['distributedPackages'][number]) =>
          sum +
          (dp.standardVersions?.length || 0) +
          (dp.recipeVersions?.length || 0),
        0,
      );
    }
    return 0;
  };

  const successfulItems = deployments
    .filter((d) => d.status === DistributionStatus.success)
    .reduce((count, d) => count + countItems(d), 0);

  const failedItems = deployments
    .filter((d) => d.status === DistributionStatus.failure)
    .reduce((count, d) => count + countItems(d), 0);

  const noChangesItems = deployments
    .filter((d) => d.status === DistributionStatus.no_changes)
    .reduce((count, d) => count + countItems(d), 0);

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
    successfulItems,
    failedItems,
    noChangesItems,
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

  // Success notifications
  if (analysis.successfulItems > 0) {
    notifications.push({
      type: 'success',
      title: 'Distribution completed successfully',
      description: `${analysis.successfulItems} standard(s)/recipe(s) distributed successfully.`,
    });
  }

  // No changes notifications
  if (analysis.noChangesItems > 0) {
    notifications.push({
      type: 'info',
      title: 'Already distributed',
      description: `${analysis.noChangesItems} standard(s)/recipe(s) already up-to-date - no changes needed.`,
    });
  }

  // Failure notifications
  if (analysis.failedItems > 0) {
    const failedTargetsList = analysis.failedTargets
      .map(
        (target) =>
          `• ${target.path} in ${target.repositoryInfo}${target.error ? ` - ${target.error}` : ''}`,
      )
      .join('\n');

    notifications.push({
      type: 'error',
      title: 'Deployment failed',
      description: `${analysis.failedItems} standard(s)/recipe(s) failed to deploy:\n${failedTargetsList}`,
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
