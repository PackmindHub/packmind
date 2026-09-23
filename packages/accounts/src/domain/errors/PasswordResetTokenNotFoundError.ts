import { AccountsError } from './AccountsError';

export class PasswordResetTokenNotFoundError extends AccountsError {
  constructor() {
    super(
      'not_found',
      'password_reset_token_invalid',
      {},
      'Password reset token not found or expired',
    );
    this.name = 'PasswordResetTokenNotFoundError';
  }
}
