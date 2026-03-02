import { ChangeProposal, ChangeProposalId } from '@packmind/types';

export type ChangeProposalWithConflicts = ChangeProposal & {
  conflictsWith: ChangeProposalId[];
};

export type SubmittedState =
  | { type: 'accepted'; artefactUrl: string }
  | { type: 'rejected' };
