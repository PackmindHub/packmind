import { CommandId, SpaceId } from '@packmind/types';
import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';
import { SPACES_SCOPE } from '../../spaces/api/queryKeys';

export const RECIPES_QUERY_SCOPE = 'recipes';

export enum CommandQueryKeys {
  LIST = 'list',
  GET_BY_ID = 'get-by-id',
  GET_VERSIONS = 'get-versions',
  GET_CHANGE_PROPOSALS = 'get-change-proposals',
}

export const getCommandsBySpaceKey = (spaceId: SpaceId | undefined) =>
  [
    ORGANIZATION_QUERY_SCOPE,
    SPACES_SCOPE,
    spaceId,
    RECIPES_QUERY_SCOPE,
    CommandQueryKeys.LIST,
  ] as const;

export const getCommandByIdKey = (
  spaceId: SpaceId | undefined,
  recipeId: CommandId | undefined,
) =>
  [
    ORGANIZATION_QUERY_SCOPE,
    SPACES_SCOPE,
    spaceId,
    RECIPES_QUERY_SCOPE,
    CommandQueryKeys.GET_BY_ID,
    recipeId,
  ] as const;

export const getCommandVersionsKey = (
  spaceId: SpaceId | undefined,
  recipeId: CommandId | undefined,
) =>
  [
    ORGANIZATION_QUERY_SCOPE,
    SPACES_SCOPE,
    spaceId,
    RECIPES_QUERY_SCOPE,
    CommandQueryKeys.GET_VERSIONS,
    recipeId,
  ] as const;

export const GET_CHANGE_PROPOSALS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  RECIPES_QUERY_SCOPE,
  CommandQueryKeys.GET_CHANGE_PROPOSALS,
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
