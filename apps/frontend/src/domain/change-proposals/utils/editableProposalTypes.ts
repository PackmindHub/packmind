import { ChangeProposalType } from '@packmind/types';

/**
 * Proposal types that support inline editing of the proposed newValue
 * before accepting. These are all ScalarUpdatePayload types for
 * name, description, and prompt fields.
 */
const editableProposalTypes = new Set<ChangeProposalType>([
  ChangeProposalType.updateStandardName,
  ChangeProposalType.updateStandardDescription,
  ChangeProposalType.updateCommandName,
  ChangeProposalType.updateCommandDescription,
  ChangeProposalType.updateSkillName,
  ChangeProposalType.updateSkillDescription,
  ChangeProposalType.updateSkillPrompt,
]);

export function isEditableProposalType(type: ChangeProposalType): boolean {
  return editableProposalTypes.has(type);
}

/**
 * Single-line types use a text input; multi-line types use a textarea.
 */
const singleLineProposalTypes = new Set<ChangeProposalType>([
  ChangeProposalType.updateStandardName,
  ChangeProposalType.updateCommandName,
  ChangeProposalType.updateSkillName,
]);

export function isSingleLineProposalType(type: ChangeProposalType): boolean {
  return singleLineProposalTypes.has(type);
}
