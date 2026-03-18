import { RecipeId, SpaceId } from '@packmind/types';
import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';
import { SPACES_SCOPE } from '../../spaces/api/queryKeys';

export const RECIPES_QUERY_SCOPE = 'recipes';

export enum RecipeQueryKeys {
  LIST = 'list',
  GET_BY_ID = 'get-by-id',
  GET_VERSIONS = 'get-versions',
  GET_CHANGE_PROPOSALS = 'get-change-proposals',
}

export const getRecipesBySpaceKey = (spaceId: SpaceId | undefined) =>
  [
    ORGANIZATION_QUERY_SCOPE,
    SPACES_SCOPE,
    spaceId,
    RECIPES_QUERY_SCOPE,
    RecipeQueryKeys.LIST,
  ] as const;

export const getRecipeByIdKey = (
  spaceId: SpaceId | undefined,
  recipeId: RecipeId | undefined,
) =>
  [
    ORGANIZATION_QUERY_SCOPE,
    SPACES_SCOPE,
    spaceId,
    RECIPES_QUERY_SCOPE,
    RecipeQueryKeys.GET_BY_ID,
    recipeId,
  ] as const;

export const getRecipeVersionsKey = (
  spaceId: SpaceId | undefined,
  recipeId: RecipeId | undefined,
) =>
  [
    ORGANIZATION_QUERY_SCOPE,
    SPACES_SCOPE,
    spaceId,
    RECIPES_QUERY_SCOPE,
    RecipeQueryKeys.GET_VERSIONS,
    recipeId,
  ] as const;

export const GET_CHANGE_PROPOSALS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  RECIPES_QUERY_SCOPE,
  RecipeQueryKeys.GET_CHANGE_PROPOSALS,
] as const;

export const APPLY_CHANGE_PROPOSAL_MUTATION_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  RECIPES_QUERY_SCOPE,
  'apply-change-proposal',
] as const;

export const REJECT_CHANGE_PROPOSAL_MUTATION_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  RECIPES_QUERY_SCOPE,
  'reject-change-proposal',
] as const;

export const BATCH_APPLY_CHANGE_PROPOSALS_MUTATION_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  RECIPES_QUERY_SCOPE,
  'batch-apply-change-proposals',
] as const;

export const BATCH_REJECT_CHANGE_PROPOSALS_MUTATION_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  RECIPES_QUERY_SCOPE,
  'batch-reject-change-proposals',
] as const;
