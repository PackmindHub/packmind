import { AccountsInternalError } from './AccountsInternalError';

export class PasswordAndHashRequiredError extends AccountsInternalError {
  constructor() {
    super(
      'password_and_hash_required',
      {},
      'Password and hash are required for validation',
    );
    this.name = 'PasswordAndHashRequiredError';
  }
}
