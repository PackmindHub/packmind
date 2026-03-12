import { ConflictDetector } from './ConflictDetector';
import { ChangeProposalType } from '@packmind/types';
import { sameProposal } from './sameProposal';
import { sameArtefact } from './sameArtefact';
import { isExpectedChangeProposalType } from '../../utils/isExpectedChangeProposalType';

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
        isExpectedChangeProposalType(cp2, expectedType) &&
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
    [ChangeProposalType.addSkillFile]: (cp1, cp2) => {
      // Guard against mismatched payload structures from different proposal types
      const cp1Item = (cp1.payload as any)?.item;
      const cp2Item = (cp2.payload as any)?.item;
      if (!cp1Item || !cp2Item) return false;
      return cp1Item.path === cp2Item.path;
    },
  });
