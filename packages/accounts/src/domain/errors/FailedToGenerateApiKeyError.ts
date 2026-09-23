import { AccountsInternalError } from './AccountsInternalError';

export class FailedToGenerateApiKeyError extends AccountsInternalError {
  constructor() {
    super('failed_to_generate_api_key', {}, 'Failed to get API key expiration');
    this.name = 'FailedToGenerateApiKeyError';
  }
}
