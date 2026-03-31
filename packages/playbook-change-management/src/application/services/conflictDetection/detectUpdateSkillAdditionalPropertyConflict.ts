import { ChangeProposal, ChangeProposalType } from '@packmind/types';
import { ConflictDetector } from './ConflictDetector';
import { sameProposal } from './sameProposal';
import { sameArtefact } from './sameArtefact';
import { sameSubTarget } from './sameSubTarget';

/**
 * Detects conflicts for updateSkillAdditionalProperty change proposals.
 *
 * Two proposals conflict when they target the same artefact, the same
 * property key (targetId), and propose different newValues.
 */
export const detectUpdateSkillAdditionalPropertyConflict: ConflictDetector<
  ChangeProposalType.updateSkillAdditionalProperty
> = (cp1, cp2, diffService) => {
  if (sameProposal(cp1, cp2) || !sameArtefact(cp1, cp2)) return false;

  if (cp2.type !== ChangeProposalType.updateSkillAdditionalProperty) {
    return false;
  }

  const narrowedCp2 =
    cp2 as ChangeProposal<ChangeProposalType.updateSkillAdditionalProperty>;

  if (!sameSubTarget(cp1, narrowedCp2, diffService)) return false;

  return cp1.payload.newValue !== narrowedCp2.payload.newValue;
};
