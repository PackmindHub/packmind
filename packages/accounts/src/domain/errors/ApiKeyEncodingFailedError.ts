import { AccountsInternalError } from './AccountsInternalError';

/**
 * Serialising an API key payload we built ourselves threw.
 */
export class ApiKeyEncodingFailedError extends AccountsInternalError {
  constructor(cause: unknown) {
    super('api_key_encoding_failed', {}, 'Failed to encode API key', {
      cause,
    });
    this.name = 'ApiKeyEncodingFailedError';
  }
}
