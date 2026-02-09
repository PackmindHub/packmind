import { RuleId } from '../standards/RuleId';
import { SkillFileId } from '../skills/SkillFileId';
import { ChangeProposalType } from './ChangeProposalType';

export type ScalarUpdatePayload = {
  oldValue: string;
  newValue: string;
};

export type CollectionItemUpdatePayload = {
  targetId: string;
  oldValue: string;
  newValue: string;
};

export type AddRulePayload = {
  content: string;
};

export type DeleteRulePayload = {
  ruleId: RuleId;
  content: string;
};

export type AddSkillFilePayload = {
  path: string;
  content: string;
  permissions: string;
};

export type DeleteSkillFilePayload = {
  fileId: SkillFileId;
  path: string;
  content: string;
};

export type ChangeProposalPayloadMap = {
  [ChangeProposalType.updateCommandName]: ScalarUpdatePayload;
  [ChangeProposalType.updateCommandDescription]: ScalarUpdatePayload;
  [ChangeProposalType.updateStandardName]: ScalarUpdatePayload;
  [ChangeProposalType.updateStandardDescription]: ScalarUpdatePayload;
  [ChangeProposalType.addRule]: AddRulePayload;
  [ChangeProposalType.updateRule]: CollectionItemUpdatePayload;
  [ChangeProposalType.deleteRule]: DeleteRulePayload;
  [ChangeProposalType.updateSkillName]: ScalarUpdatePayload;
  [ChangeProposalType.updateSkillDescription]: ScalarUpdatePayload;
  [ChangeProposalType.updateSkillPrompt]: ScalarUpdatePayload;
  [ChangeProposalType.updateSkillMetadata]: ScalarUpdatePayload;
  [ChangeProposalType.addSkillFile]: AddSkillFilePayload;
  [ChangeProposalType.updateSkillFilePath]: CollectionItemUpdatePayload;
  [ChangeProposalType.updateSkillFileContent]: CollectionItemUpdatePayload;
  [ChangeProposalType.updateSkillFilePermissions]: CollectionItemUpdatePayload;
  [ChangeProposalType.deleteSkillFile]: DeleteSkillFilePayload;
};

export type ChangeProposalPayload<
  T extends ChangeProposalType = ChangeProposalType,
> = ChangeProposalPayloadMap[T];
