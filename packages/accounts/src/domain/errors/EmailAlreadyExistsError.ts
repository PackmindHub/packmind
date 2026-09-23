import { maskEmail } from '@packmind/logger';
import { AccountsError } from './AccountsError';

export class EmailAlreadyExistsError extends AccountsError {
  constructor(email: string) {
    super(
      'conflict',
      'email_already_exists',
      { email: maskEmail(email) },
      'An account with this email address already exists',
    );
    this.name = 'EmailAlreadyExistsError';
  }
}
