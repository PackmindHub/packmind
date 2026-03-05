import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalType } from '../ChangeProposalType';

export function isExpectedChangeProposalType<T extends ChangeProposalType>(
  changeProposal: ChangeProposal,
  expectedType: T,
): changeProposal is ChangeProposal<T> {
  return changeProposal.type === expectedType;
}
