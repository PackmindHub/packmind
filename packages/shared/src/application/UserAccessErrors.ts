import { PackmindCommand } from '../types';

export type UserAccessErrorReason =
  | 'user_not_found'
  | 'user_not_in_organization'
  | 'user_not_an_admin';

export type UserAccessErrorContext = Pick<PackmindCommand, 'userId'> &
  Partial<Pick<PackmindCommand, 'organizationId'>>;

export type OrganizationContext = UserAccessErrorContext &
  Required<Pick<UserAccessErrorContext, 'organizationId'>>;

export class UserAccessError extends Error {
  readonly reason: UserAccessErrorReason;
  readonly context: UserAccessErrorContext;

  constructor(
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

export class UserNotFoundError extends UserAccessError {
  constructor(context: UserAccessErrorContext) {
    super(
      'user_not_found',
      context,
      `User not found: ${String(context.userId)}`,
    );
    this.name = 'UserNotFoundError';
  }
}

export class UserNotInOrganizationError extends UserAccessError {
  constructor(context: OrganizationContext) {
    super(
      'user_not_in_organization',
      context,
      `User ${String(context.userId)} is not a member of organization ${String(
        context.organizationId,
      )}`,
    );
    this.name = 'UserNotInOrganizationError';
  }
}

export class OrganizationAdminRequiredError extends UserAccessError {
  constructor(context: OrganizationContext) {
    super(
      'user_not_an_admin',
      context,
      `User ${String(context.userId)} must be an admin of organization ${String(
        context.organizationId,
      )} to perform this action`,
    );
    this.name = 'OrganizationAdminRequiredError';
  }
}
