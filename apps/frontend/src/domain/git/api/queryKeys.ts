import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';

export const GIT_QUERY_SCOPE = 'git';

export enum GitQueryKeys {
  GET_PROVIDERS = 'get-providers',
  GET_PROVIDER_BY_ID = 'get-provider-by-id',
  GET_REPOSITORIES = 'get-repositories',
  GET_REPOSITORIES_BY_PROVIDER = 'get-repositories-by-provider',
  GET_AVAILABLE_REPOSITORIES = 'get-available-repositories',
  GET_AVAILABLE_TARGETS = 'get-available-targets',
  GET_WEBHOOKS = 'get-webhooks',
}

// Base query key arrays for reuse
export const GET_GIT_PROVIDERS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  GIT_QUERY_SCOPE,
  GitQueryKeys.GET_PROVIDERS,
] as const;

export const GET_GIT_PROVIDER_BY_ID_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  GIT_QUERY_SCOPE,
  GitQueryKeys.GET_PROVIDER_BY_ID,
] as const;

export const GET_GIT_REPOSITORIES_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  GIT_QUERY_SCOPE,
  GitQueryKeys.GET_REPOSITORIES,
] as const;

export const GET_REPOSITORIES_BY_PROVIDER_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  GIT_QUERY_SCOPE,
  GitQueryKeys.GET_REPOSITORIES_BY_PROVIDER,
] as const;

export const GET_AVAILABLE_REPOSITORIES_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  GIT_QUERY_SCOPE,
  GitQueryKeys.GET_AVAILABLE_REPOSITORIES,
] as const;

export const GET_AVAILABLE_TARGETS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  GIT_QUERY_SCOPE,
  GitQueryKeys.GET_AVAILABLE_TARGETS,
] as const;

export const GET_GIT_WEBHOOKS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  GIT_QUERY_SCOPE,
  GitQueryKeys.GET_WEBHOOKS,
] as const;
