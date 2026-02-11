import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';

export const RECIPES_QUERY_SCOPE = 'recipes';

export enum RecipeQueryKeys {
  LIST = 'list',
  GET_BY_ID = 'get-by-id',
  GET_VERSIONS = 'get-versions',
  GET_CHANGE_PROPOSALS = 'get-change-proposals',
}

// Base query key arrays for reuse
export const GET_RECIPES_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  RECIPES_QUERY_SCOPE,
  RecipeQueryKeys.LIST,
] as const;

export const GET_RECIPE_BY_ID_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  RECIPES_QUERY_SCOPE,
  RecipeQueryKeys.GET_BY_ID,
] as const;

export const GET_RECIPE_VERSIONS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  RECIPES_QUERY_SCOPE,
  RecipeQueryKeys.GET_VERSIONS,
] as const;

export const GET_CHANGE_PROPOSALS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  RECIPES_QUERY_SCOPE,
  RecipeQueryKeys.GET_CHANGE_PROPOSALS,
] as const;

export const REJECT_CHANGE_PROPOSAL_MUTATION_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  RECIPES_QUERY_SCOPE,
  'reject-change-proposal',
] as const;
