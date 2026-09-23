import { AccountsInternalError } from './AccountsInternalError';

/**
 * Serialising an API key payload we built ourselves threw.
 */
export class ApiKeyEncodingFailedError extends AccountsInternalError {
  constructor(cause: string) {
    super('api_key_encoding_failed', { cause }, 'Failed to encode API key');
    this.name = 'ApiKeyEncodingFailedError';
  }
}
