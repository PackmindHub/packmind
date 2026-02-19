import { ChangeProposal, ChangeProposalType } from '@packmind/types';
import { detectSingleLineConflict } from './detectSingleLineConflict';
import { ConflictDetector } from './ConflictDetector';
import { detectMultiLineConflict } from './detectMultiLineConflict';
import { detectUpdateRuleConflict } from './detectUpdateRuleConflict';

type ConflictDetectorMap = {
  [K in ChangeProposalType]: ConflictDetector<K>;
};

const conflictDetectors: ConflictDetectorMap = {
  [ChangeProposalType.updateCommandName]: detectSingleLineConflict,
  [ChangeProposalType.updateCommandDescription]: detectMultiLineConflict,
  [ChangeProposalType.updateStandardName]: detectSingleLineConflict,
  [ChangeProposalType.updateStandardDescription]: detectMultiLineConflict,
  [ChangeProposalType.updateStandardScope]: detectSingleLineConflict,
  [ChangeProposalType.addRule]: () => false,
  [ChangeProposalType.updateRule]: detectUpdateRuleConflict,
  [ChangeProposalType.deleteRule]: () => false,
  [ChangeProposalType.updateSkillName]: detectSingleLineConflict,
  [ChangeProposalType.updateSkillDescription]: detectMultiLineConflict,
  [ChangeProposalType.updateSkillPrompt]: detectMultiLineConflict,
  [ChangeProposalType.updateSkillMetadata]: () => false,
  [ChangeProposalType.updateSkillLicense]: detectSingleLineConflict,
  [ChangeProposalType.updateSkillCompatibility]: detectSingleLineConflict,
  [ChangeProposalType.updateSkillAllowedTools]: detectSingleLineConflict,
  [ChangeProposalType.addSkillFile]: () => false,
  [ChangeProposalType.updateSkillFileContent]: () => false,
  [ChangeProposalType.updateSkillFilePermissions]: () => false,
  [ChangeProposalType.deleteSkillFile]: () => false,
};

export function getConflictDetector<T extends ChangeProposalType>(
  changeProposal: ChangeProposal<T>,
): ConflictDetector<T> {
  return conflictDetectors[changeProposal.type];
}
