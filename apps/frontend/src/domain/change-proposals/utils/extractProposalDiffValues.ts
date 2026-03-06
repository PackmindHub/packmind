import {
  ChangeProposal,
  ChangeProposalType,
  ScalarUpdatePayload,
  CollectionItemUpdatePayload,
  CollectionItemAddPayload,
  CollectionItemDeletePayload,
} from '@packmind/types';

export interface DiffValues {
  oldValue: string;
  newValue: string;
}

const scalarUpdateTypes = new Set<ChangeProposalType>([
  ChangeProposalType.updateCommandName,
  ChangeProposalType.updateCommandDescription,
  ChangeProposalType.updateStandardName,
  ChangeProposalType.updateStandardDescription,
  ChangeProposalType.updateStandardScope,
  ChangeProposalType.updateSkillName,
  ChangeProposalType.updateSkillDescription,
  ChangeProposalType.updateSkillPrompt,
  ChangeProposalType.updateSkillMetadata,
  ChangeProposalType.updateSkillLicense,
  ChangeProposalType.updateSkillCompatibility,
  ChangeProposalType.updateSkillAllowedTools,
]);

const collectionUpdateTypes = new Set<ChangeProposalType>([
  ChangeProposalType.updateRule,
  ChangeProposalType.updateSkillFileContent,
  ChangeProposalType.updateSkillFilePermissions,
]);

const collectionAddTypes = new Set<ChangeProposalType>([
  ChangeProposalType.addRule,
  ChangeProposalType.addSkillFile,
]);

const collectionDeleteTypes = new Set<ChangeProposalType>([
  ChangeProposalType.deleteRule,
  ChangeProposalType.deleteSkillFile,
]);

/**
 * Normalizes any proposal type to a simple { oldValue, newValue } pair
 * suitable for diff rendering.
 */
export function extractProposalDiffValues(
  proposal: ChangeProposal,
): DiffValues {
  const { type, payload } = proposal;

  if (scalarUpdateTypes.has(type)) {
    const scalarPayload = payload as ScalarUpdatePayload;
    return {
      oldValue: scalarPayload.oldValue,
      newValue: scalarPayload.newValue,
    };
  }

  if (collectionUpdateTypes.has(type)) {
    const updatePayload = payload as CollectionItemUpdatePayload<unknown>;
    return {
      oldValue: updatePayload.oldValue,
      newValue: updatePayload.newValue,
    };
  }

  if (collectionAddTypes.has(type)) {
    const addPayload = payload as CollectionItemAddPayload<{ content: string }>;
    return { oldValue: '', newValue: addPayload.item.content };
  }

  if (collectionDeleteTypes.has(type)) {
    const deletePayload = payload as CollectionItemDeletePayload<{
      id: string;
      content: string;
    }>;
    return { oldValue: deletePayload.item.content, newValue: '' };
  }

  return { oldValue: '', newValue: '' };
}
