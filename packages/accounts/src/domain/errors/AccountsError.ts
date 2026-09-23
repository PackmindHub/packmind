import { DomainError, DomainErrorKind } from '@packmind/types';

export type AccountsErrorReason =
  | 'email_already_exists'
  | 'organization_slug_conflict'
  | 'invitation_batch_empty'
  | 'invalid_invitation_email'
  | 'invitation_not_found'
  | 'invitation_expired'
  | 'password_reset_token_invalid'
  | 'user_cannot_exclude_self'
  | 'invalid_organization_name'
  | 'invalid_display_name'
  | 'missing_email'
  | 'cli_login_code_not_found'
  | 'cli_login_code_expired'
  | 'invalid_password'
  | 'user_cannot_change_own_role'
  | 'cannot_demote_last_admin'
  | 'invalid_authentication_type';

export type AccountsErrorContext = {
  organizationId?: string;
  organizationName?: string;
  userId?: string;
  invitationId?: string;
  email?: string;
  displayNameDetail?: string;
};

/**
 * Base for the accounts domain errors, in the same shape as `DeploymentsError`:
 * the `kind` decides the HTTP answer, the literal `reason` is what a client
 * branches on, and `context` carries the ids for the log instead of only
 * being interpolated into the message.
 */
export class AccountsError extends Error implements DomainError {
  readonly kind: DomainErrorKind;
  readonly reason: AccountsErrorReason;
  readonly context: AccountsErrorContext;

  constructor(
    kind: DomainErrorKind,
    reason: AccountsErrorReason,
    context: AccountsErrorContext,
    message: string,
  ) {
    super(message);
    this.name = 'AccountsError';
    this.kind = kind;
    this.reason = reason;
    this.context = context;
  }
}
