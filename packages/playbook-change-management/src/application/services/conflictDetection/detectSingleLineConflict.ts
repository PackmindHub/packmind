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
  | ChangeProposalType.updateSkillAllowedTools;

export const detectSingleLineConflict: ConflictDetector<
  SingleLineChangeProposals
> = (cp1, cp2) => {
  return (
    !sameProposal(cp1, cp2) && sameType(cp1, cp2) && sameArtefact(cp1, cp2)
  );
};
