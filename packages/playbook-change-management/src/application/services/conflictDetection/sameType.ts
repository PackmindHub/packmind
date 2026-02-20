import { ChangeProposal, ChangeProposalType } from '@packmind/types';
import { isExpectedChangeProposalType } from '../../utils/isExpectedChangeProposalType';

export function sameType<T extends ChangeProposalType>(
  cp1: ChangeProposal<T>,
  cp2: ChangeProposal,
): cp2 is ChangeProposal<T> {
  return isExpectedChangeProposalType(cp2, cp1.type);
}
