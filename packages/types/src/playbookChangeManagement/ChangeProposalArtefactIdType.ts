import { RecipeId } from '../recipes/RecipeId';
import { SkillId } from '../skills/SkillId';
import { ChangeProposalType } from './ChangeProposalType';
import { StandardId } from '../standards/StandardId';

type CommandChangeProposalArtefactIdMap = {
  [ChangeProposalType.updateCommandName]: RecipeId;
  [ChangeProposalType.updateCommandDescription]: RecipeId;
};

type StandardChangeProposalArtefactIdMap = {
  [ChangeProposalType.updateStandardName]: StandardId;
  [ChangeProposalType.updateStandardDescription]: StandardId;
  [ChangeProposalType.updateStandardScope]: StandardId;
  [ChangeProposalType.addRule]: StandardId;
  [ChangeProposalType.updateRule]: StandardId;
  [ChangeProposalType.deleteRule]: StandardId;
};

type SkillChangeProposalArtefactIdMap = {
  [ChangeProposalType.updateSkillName]: SkillId;
  [ChangeProposalType.updateSkillDescription]: SkillId;
  [ChangeProposalType.updateSkillPrompt]: SkillId;
  [ChangeProposalType.updateSkillMetadata]: SkillId;
  [ChangeProposalType.updateSkillLicense]: SkillId;
  [ChangeProposalType.updateSkillCompatibility]: SkillId;
  [ChangeProposalType.updateSkillAllowedTools]: SkillId;
  [ChangeProposalType.addSkillFile]: SkillId;
  [ChangeProposalType.updateSkillFileContent]: SkillId;
  [ChangeProposalType.updateSkillFilePermissions]: SkillId;
  [ChangeProposalType.deleteSkillFile]: SkillId;
};

type CreationChangeProposalArtefactIdMap = {
  [ChangeProposalType.newStandard]: null;
  [ChangeProposalType.newCommand]: null;
  [ChangeProposalType.newSkill]: null;
};

type ChangeProposalArtefactIdMap = CommandChangeProposalArtefactIdMap &
  StandardChangeProposalArtefactIdMap &
  SkillChangeProposalArtefactIdMap &
  CreationChangeProposalArtefactIdMap;

export type ChangeProposalArtefactId<
  T extends ChangeProposalType = ChangeProposalType,
> = ChangeProposalArtefactIdMap[T];
