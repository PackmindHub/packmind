import { ChangeProposal, ChangeProposalType } from '@packmind/types';

export function isExpectedChangeProposalType<T extends ChangeProposalType>(
  changeProposal: ChangeProposal,
  expectedType: T,
): changeProposal is ChangeProposal<T> {
  return changeProposal.type === expectedType;
}
