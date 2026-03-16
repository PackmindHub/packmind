import { ChangeProposalType } from '@packmind/types';
import { sameProposal } from './sameProposal';
import { sameType } from './sameType';
import { sameArtefact } from './sameArtefact';
import { ConflictDetector } from './ConflictDetector';

type SingleLineChangeProposals =
  | ChangeProposalType.updateCommandName
  | ChangeProposalType.updateSkillName
  | ChangeProposalType.updateStandardName
  | ChangeProposalType.updateStandardScope
  | ChangeProposalType.updateSkillCompatibility
  | ChangeProposalType.updateSkillLicense
  | ChangeProposalType.updateSkillAllowedTools
  | ChangeProposalType.updateSkillMetadata
  | ChangeProposalType.updateRule
  | ChangeProposalType.updateSkillFilePermissions;

export const detectSingleLineConflict: ConflictDetector<
  SingleLineChangeProposals
> = (cp1, cp2) => {
  const newValue1 = (cp1.decision ?? cp1.payload).newValue;
  const newValue2 = (cp2.decision ?? cp2.payload).newValue;

  return (
    !sameProposal(cp1, cp2) &&
    sameType(cp1, cp2) &&
    sameArtefact(cp1, cp2) &&
    newValue1 !== newValue2
  );
};
