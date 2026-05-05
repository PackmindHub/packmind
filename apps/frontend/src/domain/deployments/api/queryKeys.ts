import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';

export const DEPLOYMENTS_QUERY_SCOPE = 'deployments';

export enum DeploymentQueryKeys {
  LIST_RECIPE_DEPLOYMENTS = 'list-recipe-deployments',
  LIST_PACKAGE_DEPLOYMENTS = 'list-package-deployments',
  LIST_RECIPE_DISTRIBUTIONS = 'list-recipe-distributions',
  LIST_STANDARD_DISTRIBUTIONS = 'list-standard-distributions',
  LIST_SKILL_DISTRIBUTIONS = 'list-skill-distributions',
  LIST_PACKAGES_BY_SPACE = 'list-packages-by-space',
  LIST_ACTIVE_DISTRIBUTED_PACKAGES_BY_SPACE = 'list-active-distributed-packages-by-space',
  GET_PACKAGE_BY_ID = 'get-package-by-id',
  UPDATE_PACKAGE = 'update-package',
  REMOVE_PACKAGE_FROM_TARGETS = 'remove-package-from-targets',
  GET_TARGETS_BY_GIT_REPO = 'get-targets-by-git-repo',
  GET_TARGETS_BY_REPOSITORY = 'get-targets-by-repository',
  GET_TARGETS_BY_ORGANIZATION = 'get-targets-by-organization',
  GET_RENDER_MODE_CONFIGURATION = 'get-render-mode-configuration',
  GET_DASHBOARD_KPI = 'get-dashboard-kpi',
  GET_DASHBOARD_NON_LIVE = 'get-dashboard-non-live',
}

// Base query key arrays for reuse
export const LIST_RECIPE_DEPLOYMENTS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DEPLOYMENTS_QUERY_SCOPE,
  DeploymentQueryKeys.LIST_RECIPE_DEPLOYMENTS,
] as const;

export const LIST_PACKAGE_DEPLOYMENTS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DEPLOYMENTS_QUERY_SCOPE,
  DeploymentQueryKeys.LIST_PACKAGE_DEPLOYMENTS,
] as const;

export const LIST_RECIPE_DISTRIBUTIONS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DEPLOYMENTS_QUERY_SCOPE,
  DeploymentQueryKeys.LIST_RECIPE_DISTRIBUTIONS,
] as const;

export const LIST_STANDARD_DISTRIBUTIONS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DEPLOYMENTS_QUERY_SCOPE,
  DeploymentQueryKeys.LIST_STANDARD_DISTRIBUTIONS,
] as const;

export const LIST_SKILL_DISTRIBUTIONS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DEPLOYMENTS_QUERY_SCOPE,
  DeploymentQueryKeys.LIST_SKILL_DISTRIBUTIONS,
] as const;

export const LIST_PACKAGES_BY_SPACE_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DEPLOYMENTS_QUERY_SCOPE,
  DeploymentQueryKeys.LIST_PACKAGES_BY_SPACE,
] as const;

export const LIST_ACTIVE_DISTRIBUTED_PACKAGES_BY_SPACE_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DEPLOYMENTS_QUERY_SCOPE,
  DeploymentQueryKeys.LIST_ACTIVE_DISTRIBUTED_PACKAGES_BY_SPACE,
] as const;

export const GET_TARGETS_BY_GIT_REPO_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DEPLOYMENTS_QUERY_SCOPE,
  DeploymentQueryKeys.GET_TARGETS_BY_GIT_REPO,
] as const;

export const GET_TARGETS_BY_REPOSITORY_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DEPLOYMENTS_QUERY_SCOPE,
  DeploymentQueryKeys.GET_TARGETS_BY_REPOSITORY,
] as const;

export const GET_TARGETS_BY_ORGANIZATION_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DEPLOYMENTS_QUERY_SCOPE,
  DeploymentQueryKeys.GET_TARGETS_BY_ORGANIZATION,
] as const;

export const GET_RENDER_MODE_CONFIGURATION_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DEPLOYMENTS_QUERY_SCOPE,
  DeploymentQueryKeys.GET_RENDER_MODE_CONFIGURATION,
] as const;

export const GET_PACKAGE_BY_ID_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DEPLOYMENTS_QUERY_SCOPE,
  DeploymentQueryKeys.GET_PACKAGE_BY_ID,
] as const;

export const UPDATE_PACKAGE_MUTATION_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DEPLOYMENTS_QUERY_SCOPE,
  DeploymentQueryKeys.UPDATE_PACKAGE,
] as const;

export const REMOVE_PACKAGE_FROM_TARGETS_MUTATION_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DEPLOYMENTS_QUERY_SCOPE,
  DeploymentQueryKeys.REMOVE_PACKAGE_FROM_TARGETS,
] as const;

export const GET_DASHBOARD_KPI_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DEPLOYMENTS_QUERY_SCOPE,
  DeploymentQueryKeys.GET_DASHBOARD_KPI,
] as const;

export const getDashboardKpiKey = (spaceId: string) =>
  [...GET_DASHBOARD_KPI_KEY, spaceId] as const;

export const GET_DASHBOARD_NON_LIVE_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DEPLOYMENTS_QUERY_SCOPE,
  DeploymentQueryKeys.GET_DASHBOARD_NON_LIVE,
] as const;

export const getDashboardNonLiveKey = (spaceId: string) =>
  [...GET_DASHBOARD_NON_LIVE_KEY, spaceId] as const;
