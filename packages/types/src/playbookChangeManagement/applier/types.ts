import { SkillVersion } from '../../skills/SkillVersion';
import { SkillFile } from '../../skills/SkillFile';
import { RecipeVersion } from '../../recipes/RecipeVersion';
import { StandardVersion } from '../../standards/StandardVersion';
import { ChangeProposalType } from '../ChangeProposalType';

export type SkillVersionWithFiles = SkillVersion & {
  files: SkillFile[];
};

export type ApplierObjectVersions =
  | RecipeVersion
  | StandardVersion
  | SkillVersionWithFiles;

export const STANDARD_CHANGE_TYPES = [
  ChangeProposalType.updateStandardName,
  ChangeProposalType.updateStandardScope,
  ChangeProposalType.updateStandardDescription,
  ChangeProposalType.addRule,
  ChangeProposalType.updateRule,
  ChangeProposalType.deleteRule,
  ChangeProposalType.removeStandard,
];

export const RECIPE_CHANGE_TYPES = [
  ChangeProposalType.updateCommandName,
  ChangeProposalType.updateCommandDescription,
  ChangeProposalType.removeCommand,
];

export const SKILL_CHANGE_TYPES = [
  ChangeProposalType.updateSkillName,
  ChangeProposalType.updateSkillDescription,
  ChangeProposalType.updateSkillPrompt,
  ChangeProposalType.updateSkillMetadata,
  ChangeProposalType.updateSkillLicense,
  ChangeProposalType.updateSkillCompatibility,
  ChangeProposalType.updateSkillAllowedTools,
  ChangeProposalType.addSkillFile,
  ChangeProposalType.updateSkillFileContent,
  ChangeProposalType.updateSkillFilePermissions,
  ChangeProposalType.deleteSkillFile,
  ChangeProposalType.removeSkill,
];
