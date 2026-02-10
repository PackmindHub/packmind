import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';

export const CHANGE_PROPOSALS_QUERY_SCOPE = 'changeProposals';

export const CREATE_CHANGE_PROPOSAL_MUTATION_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  CHANGE_PROPOSALS_QUERY_SCOPE,
  'create',
] as const;
