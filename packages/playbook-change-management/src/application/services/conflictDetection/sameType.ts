import { ChangeProposal, ChangeProposalType } from '@packmind/types';

export function sameType<T extends ChangeProposalType>(
  cp1: ChangeProposal<T>,
  cp2: ChangeProposal,
): cp2 is ChangeProposal<T> {
  return cp1.type === cp2.type;
}
