import { ChangeProposalType } from '@packmind/types';
import { ConflictDetector } from './ConflictDetector';

type WithSubTargetTypes =
  | ChangeProposalType.updateRule
  | ChangeProposalType.deleteRule
  | ChangeProposalType.updateSkillFileContent
  | ChangeProposalType.updateSkillFilePermissions
  | ChangeProposalType.deleteSkillFile;

export const sameSubTarget: ConflictDetector<
  WithSubTargetTypes,
  WithSubTargetTypes
> = (cp1, cp2) => {
  return cp1.payload.targetId === cp2.payload.targetId;
};
