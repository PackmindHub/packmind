import { ChangeProposal } from '@packmind/types';

export function sameProposal(
  cp1: ChangeProposal,
  cp2: ChangeProposal,
): boolean {
  return cp1.id === cp2.id;
}
