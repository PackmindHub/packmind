import { ChangeProposal, ChangeProposalType } from '@packmind/types';
import { isExpectedType } from './isExpectedType';

export function sameType<T extends ChangeProposalType>(
  cp1: ChangeProposal<T>,
  cp2: ChangeProposal,
): cp2 is ChangeProposal<T> {
  return isExpectedType(cp2, cp1.type);
}
