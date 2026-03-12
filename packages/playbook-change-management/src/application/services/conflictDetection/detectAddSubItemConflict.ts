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
      // Both must be addSkillFile proposals with valid item.path to conflict
      if (cp1.type !== ChangeProposalType.addSkillFile) return false;
      if (cp2.type !== ChangeProposalType.addSkillFile) return false;

      const payload1 = cp1.payload as Record<string, unknown>;
      const payload2 = cp2.payload as Record<string, unknown>;
      const item1 = payload1?.item as Record<string, unknown> | undefined;
      const item2 = payload2?.item as Record<string, unknown> | undefined;
      if (!item1 || !item2) return false;
      return item1.path === item2.path;
    },
  });
