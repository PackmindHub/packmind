import { ChangeProposalType } from '@packmind/types';
import { ConflictDetector } from './ConflictDetector';
import { sameProposal } from './sameProposal';
import { sameArtefact } from './sameArtefact';
import { sameType } from './sameType';
import { isExpectedType } from './isExpectedType';

type DeleteSubItemChangeProposals =
  | ChangeProposalType.deleteRule
  | ChangeProposalType.deleteSkillFile;

export function makeDetectSubItemDeleteConflict<
  T extends DeleteSubItemChangeProposals,
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

export const detectDeleteRuleConflict =
  makeDetectSubItemDeleteConflict<ChangeProposalType.deleteRule>({
    [ChangeProposalType.deleteRule]: (cp1, cp2) =>
      cp1.payload.targetId === cp2.payload.targetId,
    [ChangeProposalType.updateRule]: (cp1, cp2) =>
      cp1.payload.targetId === cp2.payload.targetId,
  });

export const detectDeleteSkillFileConflict =
  makeDetectSubItemDeleteConflict<ChangeProposalType.deleteSkillFile>({
    [ChangeProposalType.deleteSkillFile]: (cp1, cp2) =>
      cp1.payload.targetId === cp2.payload.targetId,
    [ChangeProposalType.updateSkillFileContent]: (cp1, cp2) =>
      cp1.payload.targetId === cp2.payload.targetId,
    [ChangeProposalType.updateSkillFilePermissions]: (cp1, cp2) =>
      cp1.payload.targetId === cp2.payload.targetId,
  });
