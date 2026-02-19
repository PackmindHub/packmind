import { ChangeProposal } from '@packmind/types';

export function sameArtefact(
  cp1: ChangeProposal,
  cp2: ChangeProposal,
): boolean {
  return cp1.artefactId === cp2.artefactId;
}
