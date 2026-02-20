import { ConflictDetector } from './ConflictDetector';
import { ChangeProposalPayload, ChangeProposalType } from '@packmind/types';
import { sameProposal } from './sameProposal';
import { sameType } from './sameType';
import { sameArtefact } from './sameArtefact';
import { isExpectedType } from './isExpectedType';

type AddSubItemChangeProposals =
  | ChangeProposalType.addRule
  | ChangeProposalType.addSkillFile;

export function makeDetectAddSubItemConflict<
  T extends AddSubItemChangeProposals,
>(
  payloadSkimmer: (payload: ChangeProposalPayload<T>) => string,
  otherTypeConflicts: Partial<{
    [K in ChangeProposalType]: ConflictDetector<T, K>;
  }>,
): ConflictDetector<T> {
  return (cp1, cp2, diffService) => {
    if (sameProposal(cp1, cp2) || !sameArtefact(cp1, cp2)) return false;

    if (sameType(cp1, cp2)) {
      return payloadSkimmer(cp1.payload) === payloadSkimmer(cp2.payload);
    }
    for (const key of Object.keys(otherTypeConflicts)) {
      const expectedType = key as ChangeProposalType;
      const conflictDetector = otherTypeConflicts[
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
  makeDetectAddSubItemConflict<ChangeProposalType.addRule>(
    (payload) => payload.item.content,
    {
      [ChangeProposalType.updateRule]: (cp1, cp2) => {
        return cp1.payload.item.content === cp2.payload.newValue;
      },
    },
  );

export const detectAddSkillFileConflict =
  makeDetectAddSubItemConflict<ChangeProposalType.addSkillFile>(
    (payload) => payload.item.path,
    {},
  );
