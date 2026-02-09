import { RecipeId } from '../recipes/RecipeId';
import { SkillId } from '../skills/SkillId';
import { ChangeProposalType } from './ChangeProposalType';
import { StandardId } from '../standards/StandardId';

export type ChangeProposalArtefactIdMap = {
  [ChangeProposalType.updateCommandName]: RecipeId;
  [ChangeProposalType.updateCommandDescription]: RecipeId;
  [ChangeProposalType.updateStandardName]: StandardId;
  [ChangeProposalType.updateStandardDescription]: StandardId;
  [ChangeProposalType.addRule]: StandardId;
  [ChangeProposalType.updateRule]: StandardId;
  [ChangeProposalType.deleteRule]: StandardId;
  [ChangeProposalType.updateSkillName]: SkillId;
  [ChangeProposalType.updateSkillDescription]: SkillId;
  [ChangeProposalType.updateSkillPrompt]: SkillId;
  [ChangeProposalType.updateSkillMetadata]: SkillId;
  [ChangeProposalType.addSkillFile]: SkillId;
  [ChangeProposalType.updateSkillFilePath]: SkillId;
  [ChangeProposalType.updateSkillFileContent]: SkillId;
  [ChangeProposalType.updateSkillFilePermissions]: SkillId;
  [ChangeProposalType.deleteSkillFile]: SkillId;
};

export type ChangeProposalArtefactId<
  T extends ChangeProposalType = ChangeProposalType,
> = ChangeProposalArtefactIdMap[T];
