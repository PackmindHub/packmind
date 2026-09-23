import { LlmInternalError } from '@packmind/types';

/**
 * `PackmindService` delegates to a concrete provider chosen by our own
 * `PACKMIND_DEFAULT_PROVIDER` deployment setting; a missing API key for that
 * provider is a gap in our configuration, not something the caller asked
 * for, so it is ours rather than the caller's.
 */
export class PackmindProviderApiKeyMissingError extends LlmInternalError {
  constructor(provider: string, configKey: string) {
    super(
      'packmind_provider_api_key_missing',
      { provider, configKey },
      `${configKey} not found in configuration`,
    );
    this.name = 'PackmindProviderApiKeyMissingError';
  }
}
