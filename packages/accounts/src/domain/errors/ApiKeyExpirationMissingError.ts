import { AccountsInternalError } from './AccountsInternalError';

export class ApiKeyExpirationMissingError extends AccountsInternalError {
  constructor() {
    super('api_key_expiration_missing', {}, 'Failed to get API key expiration');
    this.name = 'ApiKeyExpirationMissingError';
  }
}
