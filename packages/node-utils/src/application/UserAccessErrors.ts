import { DomainError, PackmindCommand } from '@packmind/types';

export type UserAccessErrorReason =
  | 'user_not_found'
  | 'user_not_in_organization'
  | 'user_not_an_admin';

export type UserAccessErrorContext = Pick<PackmindCommand, 'userId'> &
  Partial<Pick<PackmindCommand, 'organizationId'>>;

export type OrganizationContext = UserAccessErrorContext &
  Required<Pick<UserAccessErrorContext, 'organizationId'>>;

/**
 * Abstract because `kind` is the one thing the subclasses genuinely disagree
 * on: a missing user is a 404, while every membership and role failure is a
 * 403. Nothing constructed this class directly.
 *
 * `reason` needed no change to satisfy `DomainError` — it was already a stable
 * snake_case discriminator, which is exactly the contract the frontend's
 * `ServerErrorResponse.reason` field was declared for and never received.
 */
export abstract class UserAccessError extends DomainError {
  readonly reason: UserAccessErrorReason;
  readonly context: UserAccessErrorContext;

  protected constructor(
    reason: UserAccessErrorReason,
    context: UserAccessErrorContext,
    message: string,
  ) {
    super(message);
    this.name = 'UserAccessError';
    this.reason = reason;
    this.context = context;
  }
}

/**
 * `not_found`: the requester's own record is gone, so the resource the request
 * names cannot be resolved at all.
 *
 * This status is load-bearing for the CLI, which reads a 404 on several routes
 * as a *feature-absent* sentinel. Those call sites now check `reason` before
 * drawing that conclusion, so a deleted user with a live API key is told to
 * sign in again rather than that their features do not exist. If you add
 * another 404 branch to a CLI gateway, guard it the same way.
 */
export class UserNotFoundError extends UserAccessError {
  readonly kind = 'not_found' as const;

  constructor(context: UserAccessErrorContext) {
    super(
      'user_not_found',
      context,
      'Packmind cannot find your account. Sign in again, or contact your organization admin if this keeps happening.',
    );
    this.name = 'UserNotFoundError';
  }
}

export class UserNotInOrganizationError extends UserAccessError {
  readonly kind = 'forbidden' as const;

  constructor(context: OrganizationContext) {
    super(
      'user_not_in_organization',
      context,
      'You are not a member of this organization. Ask an organization admin to invite you.',
    );
    this.name = 'UserNotInOrganizationError';
  }
}

export class OrganizationAdminRequiredError extends UserAccessError {
  readonly kind = 'forbidden' as const;

  constructor(context: OrganizationContext) {
    super(
      'user_not_an_admin',
      context,
      'Only organization admins can perform this action. Ask an admin of your organization to do it for you.',
    );
    this.name = 'OrganizationAdminRequiredError';
  }
}
