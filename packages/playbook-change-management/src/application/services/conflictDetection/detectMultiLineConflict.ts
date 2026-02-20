import { ChangeProposalType } from '@packmind/types';
import { ConflictDetector } from './ConflictDetector';
import { sameProposal } from './sameProposal';
import { sameType } from './sameType';
import { sameArtefact } from './sameArtefact';

type MultiLineChangeProposals =
  | ChangeProposalType.updateCommandDescription
  | ChangeProposalType.updateSkillDescription
  | ChangeProposalType.updateStandardDescription
  | ChangeProposalType.updateSkillPrompt
  | ChangeProposalType.updateSkillFileContent;

export const detectMultiLineConflict: ConflictDetector<
  MultiLineChangeProposals
> = (cp1, cp2, diffService) => {
  if (sameProposal(cp1, cp2) || !sameType(cp1, cp2) || !sameArtefact(cp1, cp2))
    return false;

  const { oldValue: oldValue1, newValue: newValue1 } = cp1.payload;
  const { oldValue: oldValue2, newValue: newValue2 } = cp2.payload;

  if (oldValue1 !== oldValue2) {
    return false;
  }

  return diffService.hasConflict(oldValue1, newValue1, newValue2);
};
