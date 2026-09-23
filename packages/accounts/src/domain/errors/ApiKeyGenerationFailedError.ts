import { AccountsInternalError } from './AccountsInternalError';

/**
 * Signing or encoding the API key threw. Every input is ours (a loaded user,
 * a loaded organization, the configured JWT secret), so no request could have
 * avoided it.
 */
export class ApiKeyGenerationFailedError extends AccountsInternalError {
  constructor(userId: string, organizationId: string, cause: string) {
    super(
      'api_key_generation_failed',
      { userId, organizationId, cause },
      'Failed to generate API key',
    );
    this.name = 'ApiKeyGenerationFailedError';
  }
}
