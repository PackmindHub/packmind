import { LlmInternalError } from '@packmind/types';

/**
 * The exhaustiveness guard at the end of `createLLMService`'s switch: every
 * `LLMProvider` has a case, so reaching here means the type and the runtime
 * value disagree, which only a wiring or deployment mistake can cause.
 */
export class UnknownLlmProviderError extends LlmInternalError {
  constructor(provider: string) {
    super(
      'unknown_llm_provider',
      { provider },
      `Unknown provider: ${provider}`,
    );
    this.name = 'UnknownLlmProviderError';
  }
}
