import { ChangeProposal } from './ChangeProposal';
import { ChangeProposalStatus } from './ChangeProposalStatus';
import { ChangeProposalType } from './ChangeProposalType';

export type PendingChangeProposal<
  T extends ChangeProposalType = ChangeProposalType,
> = ChangeProposal<T> & {
  status: ChangeProposalStatus.pending;
};
