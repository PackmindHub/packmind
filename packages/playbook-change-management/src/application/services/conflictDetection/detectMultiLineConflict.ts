import { ChangeProposalType, ScalarUpdatePayload } from '@packmind/types';
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

  const { oldValue: oldValue1 } = cp1.payload;
  const { oldValue: oldValue2 } = cp2.payload;
  const newValue1 = ((cp1.decision ?? cp1.payload) as ScalarUpdatePayload)
    .newValue;
  const newValue2 = ((cp2.decision ?? cp2.payload) as ScalarUpdatePayload)
    .newValue;

  if (oldValue1 !== oldValue2) {
    return false;
  }

  return diffService.hasConflict(oldValue1, newValue1, newValue2);
};
