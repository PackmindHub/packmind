import { AccountsError } from './AccountsError';

export class MissingEmailError extends AccountsError {
  constructor() {
    super(
      'invalid_input',
      'missing_email',
      {},
      'Missing email input for sign-in',
    );
    this.name = 'MissingEmailError';
  }
}
