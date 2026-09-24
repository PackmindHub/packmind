import { SkillsError } from './SkillsError';

/**
 * Error thrown when a user attempts to edit a skill they are not authorized to edit.
 * Only the skill's creator, a space admin, or an organization admin may edit a skill.
 */
export class SkillEditForbiddenError extends SkillsError {
  constructor(userId: string, skillId: string) {
    super(
      'forbidden',
      'skill_edit_forbidden',
      { userId, skillId },
      'You are not allowed to edit this skill.',
    );
    this.name = 'SkillEditForbiddenError';
  }
}
