import { AccountsError } from './AccountsError';

export class CliLoginCodeMembershipNotFoundError extends AccountsError {
  constructor(userId: string, organizationId: string) {
    super(
      'not_found',
      'cli_login_code_not_found',
      { userId, organizationId },
      'CLI login code not found or invalid',
    );
    this.name = 'CliLoginCodeMembershipNotFoundError';
  }
}
