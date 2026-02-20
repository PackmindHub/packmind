import { ChangeProposalType } from '@packmind/types';
import { ConflictDetector } from './ConflictDetector';
import { sameProposal } from './sameProposal';
import { sameArtefact } from './sameArtefact';
import { sameType } from './sameType';
import { isExpectedType } from './isExpectedType';
import { detectSingleLineConflict } from './detectSingleLineConflict';
import { detectMultiLineConflict } from './detectMultiLineConflict';
import { sameSubTarget } from './sameSubTarget';

type UpdateSubItemChangeProposals =
  | ChangeProposalType.updateRule
  | ChangeProposalType.updateSkillFileContent
  | ChangeProposalType.updateSkillFilePermissions;

export function makeDetectUpdateSubItemConflict<
  T extends UpdateSubItemChangeProposals,
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

      if (sameType(cp1, cp2) && !sameSubTarget(cp1, cp2, diffService)) {
        return false;
      }

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

export const detectUpdateRuleConflict =
  makeDetectUpdateSubItemConflict<ChangeProposalType.updateRule>({
    [ChangeProposalType.updateRule]: detectSingleLineConflict,
    [ChangeProposalType.addRule]: (cp1, cp2) => {
      return cp1.payload.newValue === cp2.payload.item.content;
    },
    [ChangeProposalType.deleteRule]: sameSubTarget,
  });

export const detectUpdateSkillFileContentConflict =
  makeDetectUpdateSubItemConflict<ChangeProposalType.updateSkillFileContent>({
    [ChangeProposalType.updateSkillFileContent]: (cp1, cp2, diffService) => {
      if (cp1.payload.isBase64 || cp2.payload.isBase64) {
        return true;
      }
      return detectMultiLineConflict(cp1, cp2, diffService);
    },
    [ChangeProposalType.deleteSkillFile]: sameSubTarget,
  });

export const detectUpdateSkillPermissionsContentConflict =
  makeDetectUpdateSubItemConflict<ChangeProposalType.updateSkillFilePermissions>(
    {
      [ChangeProposalType.updateSkillFilePermissions]: detectSingleLineConflict,
      [ChangeProposalType.deleteSkillFile]: sameSubTarget,
    },
  );
