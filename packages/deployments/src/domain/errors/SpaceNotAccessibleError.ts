import { DeploymentsError } from './DeploymentsError';

/**
 * The space does not exist, or it belongs to another organization.
 *
 * One error for both, with one message, on purpose: a caller outside the
 * organization must not be able to tell a space that is not theirs from one
 * that was never there. The organization id that was asked for is kept in the
 * context, where only the log sees it.
 *
 * Named `SpaceNotAccessible` rather than `SpaceNotFound` because
 * `@packmind/editions` already exports a `SpaceNotFoundError`, and the API
 * imports from both.
 */
export class SpaceNotAccessibleError extends DeploymentsError {
  constructor(spaceId: string, organizationId?: string) {
    super(
      'not_found',
      'space_not_accessible',
      { spaceId, ...(organizationId ? { organizationId } : {}) },
      'This space does not exist, or you do not have access to it.',
    );
    this.name = 'SpaceNotAccessibleError';
    Object.setPrototypeOf(this, SpaceNotAccessibleError.prototype);
  }
}
