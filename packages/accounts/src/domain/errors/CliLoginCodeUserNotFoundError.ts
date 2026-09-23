import { AccountsError } from './AccountsError';

export class CliLoginCodeUserNotFoundError extends AccountsError {
  constructor(userId: string) {
    super(
      'not_found',
      'cli_login_code_not_found',
      { userId },
      'CLI login code not found or invalid',
    );
    this.name = 'CliLoginCodeUserNotFoundError';
  }
}
