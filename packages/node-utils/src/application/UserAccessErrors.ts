import { DomainError, DomainErrorKind, PackmindCommand } from '@packmind/types';

export type UserAccessErrorReason =
  | 'user_not_found'
  | 'user_not_in_organization'
  | 'user_not_an_admin'
  | 'space_membership_required'
  | 'space_admin_required';

export type UserAccessErrorContext = Pick<PackmindCommand, 'userId'> &
  Partial<Pick<PackmindCommand, 'organizationId'>> & {
    spaceId?: string;
  };

export type OrganizationContext = UserAccessErrorContext &
  Required<Pick<UserAccessErrorContext, 'organizationId'>>;

export type SpaceContext = UserAccessErrorContext &
  Required<Pick<UserAccessErrorContext, 'spaceId'>>;

export class UserAccessError extends Error implements DomainError {
  readonly kind: DomainErrorKind;
  readonly reason: UserAccessErrorReason;
  readonly context: UserAccessErrorContext;

  constructor(
    kind: DomainErrorKind,
    reason: UserAccessErrorReason,
    context: UserAccessErrorContext,
    message: string,
  ) {
    super(message);
    this.name = 'UserAccessError';
    this.kind = kind;
    this.reason = reason;
    this.context = context;
  }
}

export class UserNotFoundError extends UserAccessError {
  constructor(context: UserAccessErrorContext) {
    super(
      'not_found',
      'user_not_found',
      context,
      'The user account could not be found.',
    );
    this.name = 'UserNotFoundError';
  }
}

export class UserNotInOrganizationError extends UserAccessError {
  constructor(context: OrganizationContext) {
    super(
      'forbidden',
      'user_not_in_organization',
      context,
      'That user is not a member of this organization.',
    );
    this.name = 'UserNotInOrganizationError';
  }
}

export class OrganizationAdminRequiredError extends UserAccessError {
  constructor(context: OrganizationContext) {
    super(
      'forbidden',
      'user_not_an_admin',
      context,
      'You must be an admin of this organization to perform this action.',
    );
    this.name = 'OrganizationAdminRequiredError';
  }
}
