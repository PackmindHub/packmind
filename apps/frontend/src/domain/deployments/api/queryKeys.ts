import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';

export const DEPLOYMENTS_QUERY_SCOPE = 'deployments';

export enum DeploymentQueryKeys {
  LIST_RECIPE_DEPLOYMENTS = 'list-recipe-deployments',
  LIST_STANDARD_DEPLOYMENTS = 'list-standard-deployments',
  GET_RECIPES_DEPLOYMENT_OVERVIEW = 'get-recipes-deployment-overview',
  GET_STANDARDS_DEPLOYMENT_OVERVIEW = 'get-standards-deployment-overview',
  GET_TARGETS_BY_GIT_REPO = 'get-targets-by-git-repo',
  GET_TARGETS_BY_REPOSITORY = 'get-targets-by-repository',
  GET_TARGETS_BY_ORGANIZATION = 'get-targets-by-organization',
  GET_RENDER_MODE_CONFIGURATION = 'get-render-mode-configuration',
}

// Base query key arrays for reuse
export const LIST_RECIPE_DEPLOYMENTS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DEPLOYMENTS_QUERY_SCOPE,
  DeploymentQueryKeys.LIST_RECIPE_DEPLOYMENTS,
] as const;

export const LIST_STANDARD_DEPLOYMENTS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DEPLOYMENTS_QUERY_SCOPE,
  DeploymentQueryKeys.LIST_STANDARD_DEPLOYMENTS,
] as const;

export const GET_RECIPES_DEPLOYMENT_OVERVIEW_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DEPLOYMENTS_QUERY_SCOPE,
  DeploymentQueryKeys.GET_RECIPES_DEPLOYMENT_OVERVIEW,
] as const;

export const GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DEPLOYMENTS_QUERY_SCOPE,
  DeploymentQueryKeys.GET_STANDARDS_DEPLOYMENT_OVERVIEW,
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
