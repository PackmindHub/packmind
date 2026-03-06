import { ChangeProposalType } from './ChangeProposalType';
import { ChangeProposal } from './ChangeProposal';
import { ChangeProposalStatus } from './ChangeProposalStatus';

export type AcceptedChangeProposal<
  T extends ChangeProposalType = ChangeProposalType,
> = ChangeProposal<T> & {
  status: ChangeProposalStatus.applied;
};
