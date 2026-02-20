import { ConflictDetector } from './ConflictDetector';
import { ChangeProposalType } from '@packmind/types';
import { sameProposal } from './sameProposal';
import { sameArtefact } from './sameArtefact';
import { isExpectedType } from './isExpectedType';

type AddSubItemChangeProposals =
  | ChangeProposalType.addRule
  | ChangeProposalType.addSkillFile;

export function makeDetectAddSubItemConflict<
  T extends AddSubItemChangeProposals,
>(
  conflictDetectorByType: Partial<{
    [K in ChangeProposalType]: ConflictDetector<T, K>;
  }>,
): ConflictDetector<T> {
  return (cp1, cp2, diffService) => {
    if (sameProposal(cp1, cp2) || !sameArtefact(cp1, cp2)) return false;

    for (const key of Object.keys(conflictDetectorByType)) {
      const expectedType = key as ChangeProposalType;
      const conflictDetector = conflictDetectorByType[
        expectedType
      ] as ConflictDetector<T, typeof expectedType>;

      if (
        conflictDetector &&
        isExpectedType(cp2, expectedType) &&
        conflictDetector(cp1, cp2, diffService)
      ) {
        return true;
      }
    }

    return false;
  };
}

export const detectAddRuleConflict =
  makeDetectAddSubItemConflict<ChangeProposalType.addRule>({
    [ChangeProposalType.addRule]: (cp1, cp2) =>
      cp1.payload.item.content === cp2.payload.item.content,
    [ChangeProposalType.updateRule]: (cp1, cp2) => {
      return cp1.payload.item.content === cp2.payload.newValue;
    },
  });

export const detectAddSkillFileConflict =
  makeDetectAddSubItemConflict<ChangeProposalType.addSkillFile>({
    [ChangeProposalType.addSkillFile]: (cp1, cp2) =>
      cp1.payload.item.path === cp2.payload.item.path,
  });
