import { ChangeProposal, ChangeProposalType } from '@packmind/types';
import { detectSingleLineConflict } from './detectSingleLineConflict';
import { ConflictDetector } from './ConflictDetector';
import { detectMultiLineConflict } from './detectMultiLineConflict';
import {
  detectAddRuleConflict,
  detectAddSkillFileConflict,
} from './detectAddSubItemConflict';
import {
  detectUpdateRuleConflict,
  detectUpdateSkillFileContentConflict,
  detectUpdateSkillPermissionsContentConflict,
} from './detectUpdateSubItemConflict';
import {
  detectDeleteRuleConflict,
  detectDeleteSkillFileConflict,
} from './detectSubItemDeleteConflict';

type ConflictDetectorMap = {
  [K in ChangeProposalType]: ConflictDetector<K>;
};

const conflictDetectors: ConflictDetectorMap = {
  [ChangeProposalType.updateCommandName]: detectSingleLineConflict,
  [ChangeProposalType.updateCommandDescription]: detectMultiLineConflict,
  [ChangeProposalType.updateStandardName]: detectSingleLineConflict,
  [ChangeProposalType.updateStandardDescription]: detectMultiLineConflict,
  [ChangeProposalType.updateStandardScope]: detectSingleLineConflict,
  [ChangeProposalType.addRule]: detectAddRuleConflict,
  [ChangeProposalType.updateRule]: detectUpdateRuleConflict,
  [ChangeProposalType.deleteRule]: detectDeleteRuleConflict,
  [ChangeProposalType.updateSkillName]: detectSingleLineConflict,
  [ChangeProposalType.updateSkillDescription]: detectMultiLineConflict,
  [ChangeProposalType.updateSkillPrompt]: detectMultiLineConflict,
  [ChangeProposalType.updateSkillMetadata]: detectSingleLineConflict,
  [ChangeProposalType.updateSkillLicense]: detectSingleLineConflict,
  [ChangeProposalType.updateSkillCompatibility]: detectSingleLineConflict,
  [ChangeProposalType.updateSkillAllowedTools]: detectSingleLineConflict,
  [ChangeProposalType.addSkillFile]: detectAddSkillFileConflict,
  [ChangeProposalType.updateSkillFileContent]:
    detectUpdateSkillFileContentConflict,
  [ChangeProposalType.updateSkillFilePermissions]:
    detectUpdateSkillPermissionsContentConflict,
  [ChangeProposalType.deleteSkillFile]: detectDeleteSkillFileConflict,
};

export function getConflictDetector<T extends ChangeProposalType>(
  changeProposal: ChangeProposal<T>,
): ConflictDetector<T> {
  return conflictDetectors[changeProposal.type];
}
