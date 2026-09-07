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
 * `forbidden`, not `not_found`, even though the name says otherwise.
 *
 * The missing user here is the *requester*, not a resource they asked for: a
 * token authenticates a subject that no longer resolves. 404 would be right
 * for `GET /users/:id`; for "whoever you are, you do not exist", the honest
 * answer is that the request cannot be authorized.
 *
 * The practical argument points the same way. The CLI reads a 404 on several
 * routes as a *feature-absent* sentinel — `trackingErrors.ts:16` prints
 * "Repository tracking is not available for your account", and
 * `ChangeProposalGateway.ts:28` raises `CommunityEditionError` — so a deleted
 * user with a live API key would be told their Enterprise features do not
 * exist. `apps/cli/src` is under the OSS parity contract, so teaching those
 * call sites about `reason` belongs in an OSS-first change, not here.
 */
export class UserNotFoundError extends UserAccessError {
  readonly kind = 'forbidden' as const;

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
