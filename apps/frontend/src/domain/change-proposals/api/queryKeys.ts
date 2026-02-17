import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';

export const CHANGE_PROPOSALS_QUERY_SCOPE = 'changeProposals';

export const GET_GROUPED_CHANGE_PROPOSALS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  CHANGE_PROPOSALS_QUERY_SCOPE,
  'grouped',
] as const;

export const GET_CHANGE_PROPOSALS_BY_RECIPE_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  CHANGE_PROPOSALS_QUERY_SCOPE,
  'by-recipe',
] as const;

export const CREATE_CHANGE_PROPOSAL_MUTATION_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  CHANGE_PROPOSALS_QUERY_SCOPE,
  'create',
] as const;
