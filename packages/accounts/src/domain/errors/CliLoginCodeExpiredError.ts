import { AccountsError } from './AccountsError';

/**
 * CLI login code has expired.
 *
 * Marked as `not_found` so other paths returning this error don't 500 instead
 * of 4xx. apps/api may map this to 410 Gone by hand to distinguish from a
 * code that never existed.
 */
export class CliLoginCodeExpiredError extends AccountsError {
  constructor() {
    super(
      'not_found',
      'cli_login_code_expired',
      {},
      'CLI login code not found or invalid',
    );
    this.name = 'CliLoginCodeExpiredError';
  }
}
