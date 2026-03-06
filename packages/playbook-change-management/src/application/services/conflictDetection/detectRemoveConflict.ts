import { ConflictDetector } from './ConflictDetector';
import { sameProposal } from './sameProposal';
import { sameArtefact } from './sameArtefact';
import { ChangeProposalType } from '@packmind/types';

type RemoveChangeProposals =
  | ChangeProposalType.removeStandard
  | ChangeProposalType.removeCommand
  | ChangeProposalType.removeSkill;
export const detectRemoveConflict: ConflictDetector<RemoveChangeProposals> = (
  cp1,
  cp2,
) => {
  return !sameProposal(cp1, cp2) && sameArtefact(cp1, cp2);
};
