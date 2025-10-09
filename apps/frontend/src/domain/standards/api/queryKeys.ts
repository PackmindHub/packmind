import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';

export const STANDARDS_QUERY_SCOPE = 'standards';

export enum StandardQueryKeys {
  LIST = 'list',
  GET_BY_ID = 'get-by-id',
  GET_VERSIONS = 'get-versions',
  GET_RULES_BY_STANDARD_ID = 'get-rules-by-standard-id',
}

// Base query key arrays for reuse
export const GET_STANDARDS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  STANDARDS_QUERY_SCOPE,
  StandardQueryKeys.LIST,
] as const;

export const GET_STANDARD_BY_ID_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  STANDARDS_QUERY_SCOPE,
  StandardQueryKeys.GET_BY_ID,
] as const;

export const GET_STANDARD_VERSIONS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  STANDARDS_QUERY_SCOPE,
  StandardQueryKeys.GET_VERSIONS,
] as const;

export const GET_RULES_BY_STANDARD_ID_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  STANDARDS_QUERY_SCOPE,
  StandardQueryKeys.GET_RULES_BY_STANDARD_ID,
] as const;
