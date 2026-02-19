import { ConflictDetector } from './ConflictDetector';
import { ChangeProposalPayload, ChangeProposalType } from '@packmind/types';
import { sameProposal } from './sameProposal';
import { sameType } from './sameType';
import { sameArtefact } from './sameArtefact';

type AddSubItemChangeProposals =
  | ChangeProposalType.addRule
  | ChangeProposalType.addSkillFile;

export function makeDetectAddSubItemConflict<
  T extends AddSubItemChangeProposals,
>(
  payloadSkimmer: (payload: ChangeProposalPayload<T>) => string,
): ConflictDetector<T> {
  return (cp1, cp2) => {
    if (
      sameProposal(cp1, cp2) ||
      !sameType(cp1, cp2) ||
      !sameArtefact(cp1, cp2)
    )
      return false;

    return payloadSkimmer(cp1.payload) === payloadSkimmer(cp2.payload);
  };
}

export const detectAddRuleConflict =
  makeDetectAddSubItemConflict<ChangeProposalType.addRule>(
    (payload) => payload.item.content,
  );

export const detectAddSkillFileConflict =
  makeDetectAddSubItemConflict<ChangeProposalType.addSkillFile>(
    (payload) => payload.item.path,
  );
