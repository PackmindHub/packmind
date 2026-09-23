import { PackmindInternalError } from '@packmind/types';

export type AccountsInternalErrorReason =
  | 'organization_not_found'
  | 'cli_login_code_user_not_found'
  | 'cli_login_code_membership_not_found'
  | 'cli_login_code_organization_not_found'
  | 'cli_login_code_api_key_error';

export type AccountsInternalErrorContext = {
  organizationId?: string;
  userId?: string;
  membershipId?: string;
};

/**
 * Base for the accounts broken invariants, in the same shape as
 * `AccountsError` but on the internal side: no `kind` to choose — it is
 * always 500, logged with its stack and with its message withheld from the
 * client — a literal `reason` union naming the invariant and a typed `context`
 * carrying the ids.
 *
 * The line between this and `AccountsError` is fault, not severity: if the
 * caller could have avoided it by asking for something else, it is an
 * `AccountsError`. If the write already landed and the read after it
 * disagreed, it is this.
 */
export class AccountsInternalError extends PackmindInternalError {
  constructor(
    reason: AccountsInternalErrorReason,
    context: AccountsInternalErrorContext,
    message: string,
  ) {
    super(reason, context, message);
    this.name = 'AccountsInternalError';
  }
}
