import { ChangeProposalStatus, ChangeProposalType } from '@packmind/types';

const changeProposalFieldLabels: Record<ChangeProposalType, string> = {
  [ChangeProposalType.updateCommandName]: 'Name',
  [ChangeProposalType.updateCommandDescription]: 'Description',
  [ChangeProposalType.updateStandardName]: 'Name',
  [ChangeProposalType.updateStandardDescription]: 'Description',
  [ChangeProposalType.addRule]: 'Rule (add)',
  [ChangeProposalType.updateRule]: 'Rule (update)',
  [ChangeProposalType.deleteRule]: 'Rule (delete)',
  [ChangeProposalType.updateSkillName]: 'Name',
  [ChangeProposalType.updateSkillDescription]: 'Description',
  [ChangeProposalType.updateSkillPrompt]: 'Prompt',
  [ChangeProposalType.updateSkillMetadata]: 'Metadata',
  [ChangeProposalType.updateSkillLicense]: 'License',
  [ChangeProposalType.updateSkillCompatibility]: 'Compatibility',
  [ChangeProposalType.updateSkillAllowedTools]: 'Allowed Tools',
  [ChangeProposalType.addSkillFile]: 'File (add)',
  [ChangeProposalType.updateSkillFileContent]: 'File content',
  [ChangeProposalType.updateSkillFilePermissions]: 'File permissions',
  [ChangeProposalType.deleteSkillFile]: 'File (delete)',
};

export function getChangeProposalFieldLabel(type: ChangeProposalType): string {
  return changeProposalFieldLabels[type];
}

export function getStatusBadgeProps(status: ChangeProposalStatus): {
  label: string;
  colorPalette: string;
} {
  switch (status) {
    case ChangeProposalStatus.pending:
      return { label: 'Pending', colorPalette: 'green' };
    case ChangeProposalStatus.applied:
      return { label: 'Accepted', colorPalette: 'green' };
    case ChangeProposalStatus.rejected:
      return { label: 'Dismissed', colorPalette: 'red' };
  }
}
