import { RuleId } from '../standards/RuleId';
import { Rule } from '../standards/Rule';
import { SkillFileId } from '../skills/SkillFileId';
import { SkillFile } from '../skills/SkillFile';
import { ChangeProposalType } from './ChangeProposalType';
import { PackageId } from '../deployments';

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

export type CommandChangeProposalPayloadMap = {
  [ChangeProposalType.updateCommandName]: ScalarUpdatePayload;
  [ChangeProposalType.updateCommandDescription]: ScalarUpdatePayload;
};

export type StandardChangeProposalPayloadMap = {
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

export type SkillChangeProposalPayloadMap = {
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

/*
 * Note: the `delete` and `removeFromPackages` fields are there to store the user decision when applying the changeProposal.
 * */
export type RemoveArtefactPayload = {
  packageIds: PackageId[];
};

export type NewStandardPayload = {
  name: string;
  description: string;
  scope: string[] | string | null;
  rules: Array<{ content: string }>;
};

export type NewCommandPayload = {
  name: string;
  content: string;
};

export type NewSkillPayload = {
  name: string;
  description: string;
  prompt: string;
  skillMdPermissions: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowedTools?: string;
  files?: Array<Omit<SkillFile, 'id' | 'skillVersionId'>>;
};

export type CreationChangeProposalPayloadMap = {
  [ChangeProposalType.createStandard]: NewStandardPayload;
  [ChangeProposalType.createCommand]: NewCommandPayload;
  [ChangeProposalType.createSkill]: NewSkillPayload;
};

type RemovalChangeProposalPayloadMap = {
  [ChangeProposalType.removeStandard]: RemoveArtefactPayload;
  [ChangeProposalType.removeCommand]: RemoveArtefactPayload;
  [ChangeProposalType.removeSkill]: RemoveArtefactPayload;
};

type ChangeProposalPayloadMap = CommandChangeProposalPayloadMap &
  StandardChangeProposalPayloadMap &
  SkillChangeProposalPayloadMap &
  CreationChangeProposalPayloadMap &
  RemovalChangeProposalPayloadMap;

export type ChangeProposalPayload<
  T extends ChangeProposalType = ChangeProposalType,
> = ChangeProposalPayloadMap[T];
