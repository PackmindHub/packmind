import { SkillsError } from './SkillsError';

/**
 * The skill does not exist, or it belongs to another space than the one
 * asked for.
 *
 * One error for both, with one message, on purpose: a caller must not be
 * able to tell a skill outside their space from one that was never there.
 * The space id that was asked for is kept in the context, where only the log
 * sees it.
 */
export class SkillNotFoundError extends SkillsError {
  constructor(skillId: string, spaceId?: string) {
    super(
      'not_found',
      'skill_not_found',
      { skillId, ...(spaceId ? { spaceId } : {}) },
      'This skill does not exist, or you do not have access to it.',
    );
    this.name = 'SkillNotFoundError';
  }
}
