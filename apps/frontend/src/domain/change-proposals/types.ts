import { ChangeProposal, ChangeProposalId } from '@packmind/types';

export type ChangeProposalWithConflicts = ChangeProposal & {
  conflictsWith: ChangeProposalId[];
};
