import { ChangeProposalType } from '@packmind/types';

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
  [ChangeProposalType.addSkillFile]: 'File (add)',
  [ChangeProposalType.updateSkillFilePath]: 'File path',
  [ChangeProposalType.updateSkillFileContent]: 'File content',
  [ChangeProposalType.updateSkillFilePermissions]: 'File permissions',
  [ChangeProposalType.deleteSkillFile]: 'File (delete)',
};

export function getChangeProposalFieldLabel(type: ChangeProposalType): string {
  return changeProposalFieldLabels[type];
}
