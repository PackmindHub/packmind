import { AccountsError } from './AccountsError';

/**
 * `createUser` was called without an email, password or organization.
 *
 * The caller's fault: the sign-up body reaches it unvalidated for the email,
 * so an empty email from the request lands here.
 */
export class UserCreationFieldsRequiredError extends AccountsError {
  constructor(organizationId?: string) {
    super(
      'invalid_input',
      'user_creation_fields_required',
      { organizationId },
      'Email, password, and organizationId are required',
    );
    this.name = 'UserCreationFieldsRequiredError';
  }
}
