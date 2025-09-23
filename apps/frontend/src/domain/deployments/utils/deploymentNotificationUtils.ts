import {
  RecipesDeployment,
  StandardsDeployment,
  DistributionStatus,
  Target,
  GitRepo,
} from '@packmind/shared/types';

// Extended target type that includes the joined gitRepo from TypeORM queries
type TargetWithGitRepo = Target & {
  gitRepo?: GitRepo;
};

export interface DeploymentNotificationResult {
  type: 'success' | 'warning' | 'error';
  title: string;
  description: string;
}

export interface DeploymentAnalysis {
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  failedTargets: Array<{
    name: string;
    path: string;
    repositoryInfo: string;
    error?: string;
  }>;
}

/**
 * Analyzes deployment results from both recipes and standards deployments
 * and returns appropriate notification data
 */
export function analyzeDeploymentResults(
  recipesDeployments: RecipesDeployment[] = [],
  standardsDeployments: StandardsDeployment[] = [],
): DeploymentNotificationResult {
  const allDeployments = [...recipesDeployments, ...standardsDeployments];

  if (allDeployments.length === 0) {
    return {
      type: 'error',
      title: 'No deployments found',
      description: 'No deployments were created. Please try again.',
    };
  }

  const analysis = getDeploymentAnalysis(allDeployments);

  // All successful
  if (analysis.failedDeployments === 0) {
    return {
      type: 'success',
      title: 'Deployment completed successfully',
      description: `All ${analysis.totalDeployments} deployment(s) completed successfully.`,
    };
  }

  // All failed
  if (analysis.successfulDeployments === 0) {
    const failedTargetsList = analysis.failedTargets
      .map(
        (target) =>
          `• ${target.path} in ${target.repositoryInfo}${target.error ? ` - ${target.error}` : ''}`,
      )
      .join('\n');

    return {
      type: 'error',
      title: 'All deployments failed',
      description: `All ${analysis.totalDeployments} deployment(s) failed:\n${failedTargetsList}`,
    };
  }

  // Mixed results
  const failedTargetsList = analysis.failedTargets
    .map((target) => `• ${target.path} in ${target.repositoryInfo}`)
    .join('\n');

  return {
    type: 'warning',
    title: 'Partial deployment completed',
    description: `${analysis.successfulDeployments} of ${analysis.totalDeployments} deployment(s) successful. Failed targets:\n${failedTargetsList}`,
  };
}

/**
 * Analyzes an array of deployments (recipes or standards) and returns statistics
 */
function getDeploymentAnalysis(
  deployments: (RecipesDeployment | StandardsDeployment)[],
): DeploymentAnalysis {
  const totalDeployments = deployments.length;
  const successfulDeployments = deployments.filter(
    (d) => d.status === DistributionStatus.success,
  ).length;
  const failedDeployments = deployments.filter(
    (d) => d.status === DistributionStatus.failure,
  ).length;

  const failedTargets = deployments
    .filter((d) => d.status === DistributionStatus.failure)
    .map((d) => {
      // Try to get repository information from the target
      const target = d.target as TargetWithGitRepo;
      const gitRepo = target.gitRepo;
      const repositoryInfo = gitRepo
        ? `${gitRepo.owner}/${gitRepo.repo}:${gitRepo.branch}`
        : `Repository ID: ${d.target.gitRepoId}`;

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
    failedTargets,
  };
}

/**
 * Creates a detailed breakdown of what was deployed
 */
export function createDeploymentSummary(
  recipesDeployments: RecipesDeployment[] = [],
  standardsDeployments: StandardsDeployment[] = [],
): string {
  const parts: string[] = [];

  if (recipesDeployments.length > 0) {
    const recipeNames = [
      ...new Set(
        recipesDeployments.flatMap((d) =>
          d.recipeVersions.map((rv) => rv.name),
        ),
      ),
    ];
    parts.push(`${recipeNames.length} recipe(s): ${recipeNames.join(', ')}`);
  }

  if (standardsDeployments.length > 0) {
    const standardNames = [
      ...new Set(
        standardsDeployments.flatMap((d) =>
          d.standardVersions.map((sv) => sv.name),
        ),
      ),
    ];
    parts.push(
      `${standardNames.length} standard(s): ${standardNames.join(', ')}`,
    );
  }

  return parts.join(' | ');
}
