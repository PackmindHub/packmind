import { AccountsError } from './AccountsError';

export class InvalidAuthenticationTypeError extends AccountsError {
  constructor(method: string) {
    super(
      'invalid_input',
      'invalid_authentication_type',
      {},
      `Authentication type not found: ${method}`,
    );
    this.name = 'InvalidAuthenticationTypeError';
  }
}
