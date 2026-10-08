import { AccountsError } from './AccountsError';

/**
 * One error for an unknown email, a wrong password and a social account with
 * no password, so the answer never tells which of the three it was.
 */
export class InvalidEmailOrPasswordError extends AccountsError {
  constructor() {
    super(
      'unauthenticated',
      'invalid_credentials',
      {},
      'Invalid email or password',
    );
    this.name = 'InvalidEmailOrPasswordError';
  }
}
