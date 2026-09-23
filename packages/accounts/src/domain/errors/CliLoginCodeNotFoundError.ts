import { AccountsError } from './AccountsError';

export class CliLoginCodeNotFoundError extends AccountsError {
  constructor() {
    super(
      'not_found',
      'cli_login_code_not_found',
      {},
      'CLI login code not found or invalid',
    );
    this.name = 'CliLoginCodeNotFoundError';
  }
}
