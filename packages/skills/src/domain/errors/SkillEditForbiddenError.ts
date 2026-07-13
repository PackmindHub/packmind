/**
 * Error thrown when a user attempts to edit a skill they are not authorized to edit.
 * Only the skill's creator, a space admin, or an organization admin may edit a skill.
 */
export class SkillEditForbiddenError extends Error {
  constructor(
    public readonly userId: string,
    public readonly skillId: string,
  ) {
    super(`User ${userId} is not allowed to edit skill ${skillId}`);
    this.name = 'SkillEditForbiddenError';
  }
}
