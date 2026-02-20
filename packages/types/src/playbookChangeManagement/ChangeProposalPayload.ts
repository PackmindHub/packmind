import { RuleId } from '../standards/RuleId';
import { Rule } from '../standards/Rule';
import { SkillFileId } from '../skills/SkillFileId';
import { SkillFile } from '../skills/SkillFile';
import { ChangeProposalType } from './ChangeProposalType';

export type ScalarUpdatePayload = {
  oldValue: string;
  newValue: string;
};

export type CollectionItemUpdatePayload<T> = {
  targetId: T;
  oldValue: string;
  newValue: string;
};

export type SkillFileContentUpdatePayload =
  CollectionItemUpdatePayload<SkillFileId> & {
    isBase64?: boolean;
  };

export type CollectionItemAddPayload<T> = {
  item: T;
};

export type CollectionItemDeletePayload<T extends { id: string }> = {
  targetId: T['id'];
  item: T;
};

type CommandChangeProposalPayloadMap = {
  [ChangeProposalType.updateCommandName]: ScalarUpdatePayload;
  [ChangeProposalType.updateCommandDescription]: ScalarUpdatePayload;
};

type StandardChangeProposalPayloadMap = {
  [ChangeProposalType.updateStandardName]: ScalarUpdatePayload;
  [ChangeProposalType.updateStandardDescription]: ScalarUpdatePayload;
  [ChangeProposalType.updateStandardScope]: ScalarUpdatePayload;
  [ChangeProposalType.addRule]: CollectionItemAddPayload<
    Omit<Rule, 'id' | 'standardVersionId'>
  >;
  [ChangeProposalType.updateRule]: CollectionItemUpdatePayload<RuleId>;
  [ChangeProposalType.deleteRule]: CollectionItemDeletePayload<
    Omit<Rule, 'standardVersionId'>
  >;
};

type SkillChangeProposalPayloadMap = {
  [ChangeProposalType.updateSkillName]: ScalarUpdatePayload;
  [ChangeProposalType.updateSkillDescription]: ScalarUpdatePayload;
  [ChangeProposalType.updateSkillPrompt]: ScalarUpdatePayload;
  [ChangeProposalType.updateSkillMetadata]: ScalarUpdatePayload;
  [ChangeProposalType.updateSkillLicense]: ScalarUpdatePayload;
  [ChangeProposalType.updateSkillCompatibility]: ScalarUpdatePayload;
  [ChangeProposalType.updateSkillAllowedTools]: ScalarUpdatePayload;
  [ChangeProposalType.addSkillFile]: CollectionItemAddPayload<
    Omit<SkillFile, 'id' | 'skillVersionId'>
  >;
  [ChangeProposalType.updateSkillFileContent]: SkillFileContentUpdatePayload;
  [ChangeProposalType.updateSkillFilePermissions]: CollectionItemUpdatePayload<SkillFileId>;
  [ChangeProposalType.deleteSkillFile]: CollectionItemDeletePayload<
    Omit<SkillFile, 'skillVersionId'>
  >;
};

type ChangeProposalPayloadMap = CommandChangeProposalPayloadMap &
  StandardChangeProposalPayloadMap &
  SkillChangeProposalPayloadMap;

export type ChangeProposalPayload<
  T extends ChangeProposalType = ChangeProposalType,
> = ChangeProposalPayloadMap[T];
