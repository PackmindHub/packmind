import { SkillsError } from './SkillsError';

/**
 * The space does not exist, or it belongs to another organization.
 *
 * One error for both, with one message, on purpose: a caller outside the
 * organization must not be able to tell a space that is not theirs from one
 * that was never there. The organization id that was asked for is kept in the
 * context, where only the log sees it.
 *
 * Named `SkillSpaceNotAccessible` rather than `SpaceNotAccessible` because
 * `@packmind/deployments` and `@packmind/editions` already export space
 * not-found classes.
 */
export class SkillSpaceNotAccessibleError extends SkillsError {
  constructor(spaceId: string, organizationId?: string) {
    super(
      'not_found',
      'space_not_accessible',
      { spaceId, ...(organizationId ? { organizationId } : {}) },
      'This space does not exist, or you do not have access to it.',
    );
    this.name = 'SkillSpaceNotAccessibleError';
  }
}
