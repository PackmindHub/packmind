import { ConflictDetector } from './ConflictDetector';
import { ChangeProposalPayload, ChangeProposalType } from '@packmind/types';
import { sameProposal } from './sameProposal';
import { sameArtefact } from './sameArtefact';
import { sameType } from './sameType';
import { isExpectedType } from './isExpectedType';

function isUpdateRulePayloadConflicting(
  payload: ChangeProposalPayload<ChangeProposalType.updateRule>,
  payload2: ChangeProposalPayload<ChangeProposalType.updateRule>,
): boolean {
  return (
    payload.targetId === payload2.targetId &&
    payload.newValue !== payload2.newValue
  );
}

export const detectUpdateRuleConflict: ConflictDetector<
  ChangeProposalType.updateRule
> = (cp1, cp2) => {
  console.log({
    sameType: sameType(cp1, cp2),
    sameProposal: sameProposal(cp1, cp2),
    sameArtefact: sameArtefact(cp1, cp2),
  });

  if (sameProposal(cp1, cp2) || !sameArtefact(cp1, cp2)) return false;

  if (sameType(cp1, cp2)) {
    return isUpdateRulePayloadConflicting(cp1.payload, cp2.payload);
  }

  if (isExpectedType(cp2, ChangeProposalType.deleteRule)) {
    return cp1.payload.targetId === cp2.payload.targetId;
  }

  return false;
};
