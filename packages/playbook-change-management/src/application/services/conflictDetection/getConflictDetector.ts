import { ChangeProposal, ChangeProposalType } from '@packmind/types';
import { detectSingleLineConflict } from './detectSingleLineConflict';
import { ConflictDetector } from './ConflictDetector';
import { detectMultiLineConflict } from './detectMultiLineConflict';

type ConflictDetectorMap = {
  [K in ChangeProposalType]: ConflictDetector<K>;
};

const conflictDetectors: ConflictDetectorMap = {
  [ChangeProposalType.updateCommandName]: detectSingleLineConflict,
  [ChangeProposalType.updateCommandDescription]: detectMultiLineConflict,
  [ChangeProposalType.updateStandardName]: () => false,
  [ChangeProposalType.updateStandardDescription]: () => false,
  [ChangeProposalType.updateStandardScope]: () => false,
  [ChangeProposalType.addRule]: () => false,
  [ChangeProposalType.updateRule]: () => false,
  [ChangeProposalType.deleteRule]: () => false,
  [ChangeProposalType.updateSkillName]: () => false,
  [ChangeProposalType.updateSkillDescription]: () => false,
  [ChangeProposalType.updateSkillPrompt]: () => false,
  [ChangeProposalType.updateSkillMetadata]: () => false,
  [ChangeProposalType.updateSkillLicense]: () => false,
  [ChangeProposalType.updateSkillCompatibility]: () => false,
  [ChangeProposalType.updateSkillAllowedTools]: () => false,
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
