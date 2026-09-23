import { AccountsInternalError } from './AccountsInternalError';

export class CliLoginCodeApiKeyError extends AccountsInternalError {
  constructor() {
    super(
      'cli_login_code_api_key_error',
      {},
      'Failed to generate API key or get expiration',
    );
    this.name = 'CliLoginCodeApiKeyError';
  }
}
