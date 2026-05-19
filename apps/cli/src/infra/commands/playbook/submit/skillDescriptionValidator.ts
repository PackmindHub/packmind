import {
  ChangeProposalType,
  NewSkillPayload,
  ScalarUpdatePayload,
} from '@packmind/types';
import { DESCRIPTION_MAX_LENGTH } from '@packmind/skills';

import { ProposalItem } from './proposalBuilder';

/**
 * Checks that no submitted proposal carries a skill description longer than
 * the backend-enforced limit. Mirrors `SkillValidator.validateDescriptionFormat`
 * to fail fast on the CLI with an actionable error message, instead of
 * surfacing a generic API error later.
 */
export function validateProposalSkillDescriptions(
  proposals: ProposalItem[],
): string[] {
  const errors: string[] = [];

  for (const proposal of proposals) {
    if (proposal.type === ChangeProposalType.createSkill) {
      const payload = proposal.payload as NewSkillPayload;
      const description = payload?.description ?? '';
      if (description.length > DESCRIPTION_MAX_LENGTH) {
        errors.push(
          `Skill "${payload.name ?? 'unknown'}" has a description of ${description.length} characters, which exceeds the maximum of ${DESCRIPTION_MAX_LENGTH}. Edit the "description" field in SKILL.md and try again.`,
        );
      }
    } else if (proposal.type === ChangeProposalType.updateSkillDescription) {
      const payload = proposal.payload as ScalarUpdatePayload;
      const newValue = payload?.newValue ?? '';
      if (newValue.length > DESCRIPTION_MAX_LENGTH) {
        const label = proposal.artefactId ?? 'unknown';
        errors.push(
          `Skill (id: ${label}) has a description of ${newValue.length} characters, which exceeds the maximum of ${DESCRIPTION_MAX_LENGTH}. Edit the "description" field in SKILL.md and try again.`,
        );
      }
    }
  }

  return errors;
}
