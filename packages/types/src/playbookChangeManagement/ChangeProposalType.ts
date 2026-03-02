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
  createStandard = 'createStandard',
  createCommand = 'createCommand',
  createSkill = 'createSkill',
}

export type ChangeProposalItemType = 'standard' | 'command' | 'skill';

const standardTypes = new Set<ChangeProposalType>([
  ChangeProposalType.updateStandardName,
  ChangeProposalType.updateStandardDescription,
  ChangeProposalType.updateStandardScope,
  ChangeProposalType.addRule,
  ChangeProposalType.updateRule,
  ChangeProposalType.deleteRule,
  ChangeProposalType.createStandard,
]);

const commandTypes = new Set<ChangeProposalType>([
  ChangeProposalType.updateCommandName,
  ChangeProposalType.updateCommandDescription,
  ChangeProposalType.createCommand,
]);

export function getItemTypeFromChangeProposalType(
  type: ChangeProposalType,
): ChangeProposalItemType {
  if (standardTypes.has(type)) return 'standard';
  if (commandTypes.has(type)) return 'command';
  return 'skill';
}
