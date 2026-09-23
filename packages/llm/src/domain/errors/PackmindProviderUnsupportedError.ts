import { LlmInternalError } from '@packmind/types';

/**
 * `PackmindService` only knows how to delegate to OpenAI, Anthropic and
 * Gemini. Naming Packmind itself, or any other provider, as the underlying
 * one for `PACKMIND_DEFAULT_PROVIDER` is a deployment configuration mistake,
 * not a caller mistake.
 */
export class PackmindProviderUnsupportedError extends LlmInternalError {
  constructor(provider: string, message: string) {
    super('packmind_provider_unsupported', { provider }, message);
    this.name = 'PackmindProviderUnsupportedError';
  }
}
