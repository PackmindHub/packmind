import {
  ChangeProposal,
  ChangeProposalDecision,
  ChangeProposalType,
  RemoveChangeProposalTypes,
} from '@packmind/types';

export function getDecision<T extends ChangeProposalType>(
  changeProposal: ChangeProposal<T>,
): ChangeProposalDecision<T> {
  if (isDeletionChangeProposal(changeProposal)) {
    return {
      delete: false,
      removeFromPackages: [],
    } as unknown as ChangeProposalDecision<T>;
  }
  return changeProposal.payload as unknown as ChangeProposalDecision<T>;
}

function isDeletionChangeProposal(
  cp: ChangeProposal,
): cp is ChangeProposal<RemoveChangeProposalTypes> {
  return (
    isExpectedChangeProposalType(cp, ChangeProposalType.removeCommand) ||
    isExpectedChangeProposalType(cp, ChangeProposalType.removeStandard) ||
    isExpectedChangeProposalType(cp, ChangeProposalType.removeSkill)
  );
}

function isExpectedChangeProposalType<T extends ChangeProposalType>(
  changeProposal: ChangeProposal,
  expectedType: T,
): changeProposal is ChangeProposal<T> {
  return changeProposal.type === expectedType;
}
