export enum ChangeProposalType {
  updateCommandName = 'updateCommandName',
  updateCommandDescription = 'updateCommandDescription',
  updateStandardName = 'updateStandardName',
  updateStandardDescription = 'updateStandardDescription',
  updateStandardScope = 'updateStandardScope',
  addRule = 'addRule',
  updateRule = 'updateRule',
  deleteRule = 'deleteRule',
  updateSkillName = 'updateSkillName',
  updateSkillDescription = 'updateSkillDescription',
  updateSkillPrompt = 'updateSkillPrompt',
  updateSkillMetadata = 'updateSkillMetadata',
  updateSkillLicense = 'updateSkillLicense',
  updateSkillCompatibility = 'updateSkillCompatibility',
  updateSkillAllowedTools = 'updateSkillAllowedTools',
  addSkillFile = 'addSkillFile',
  updateSkillFileContent = 'updateSkillFileContent',
  updateSkillFilePermissions = 'updateSkillFilePermissions',
  deleteSkillFile = 'deleteSkillFile',
  updateSkillAdditionalProperty = 'updateSkillAdditionalProperty',
  createStandard = 'createStandard',
  createCommand = 'createCommand',
  createSkill = 'createSkill',
  removeStandard = 'removeStandard',
  removeCommand = 'removeCommand',
  removeSkill = 'removeSkill',
}

export type CreationChangeProposalTypes =
  | ChangeProposalType.createCommand
  | ChangeProposalType.createStandard
  | ChangeProposalType.createSkill;

export type RemoveChangeProposalTypes =
  | ChangeProposalType.removeCommand
  | ChangeProposalType.removeStandard
  | ChangeProposalType.removeSkill;

export type ChangeProposalItemType = 'standard' | 'command' | 'skill';

const standardTypes = new Set<ChangeProposalType>([
  ChangeProposalType.updateStandardName,
  ChangeProposalType.updateStandardDescription,
  ChangeProposalType.updateStandardScope,
  ChangeProposalType.addRule,
  ChangeProposalType.updateRule,
  ChangeProposalType.deleteRule,
  ChangeProposalType.createStandard,
  ChangeProposalType.removeStandard,
]);

const commandTypes = new Set<ChangeProposalType>([
  ChangeProposalType.updateCommandName,
  ChangeProposalType.updateCommandDescription,
  ChangeProposalType.createCommand,
  ChangeProposalType.removeCommand,
]);

const editableTypes = new Set<ChangeProposalType>([
  ChangeProposalType.updateStandardName,
  ChangeProposalType.updateStandardDescription,
  ChangeProposalType.updateCommandName,
  ChangeProposalType.updateCommandDescription,
  ChangeProposalType.updateSkillName,
  ChangeProposalType.updateSkillDescription,
  ChangeProposalType.updateSkillPrompt,
]);

export function isEditableProposalType(type: ChangeProposalType): boolean {
  return editableTypes.has(type);
}

export function getItemTypeFromChangeProposalType(
  type: ChangeProposalType,
): ChangeProposalItemType {
  if (standardTypes.has(type)) return 'standard';
  if (commandTypes.has(type)) return 'command';
  return 'skill';
}
