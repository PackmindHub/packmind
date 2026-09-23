import { LlmError, LlmErrorContext } from './LlmError';

/**
 * The organization has no AI provider configured. An admin can correct it by
 * configuring one, so this is the caller's side, a 400, not a 500. A
 * configured provider that fails to answer is an `AIServiceError` instead.
 */
export class AiNotConfigured extends LlmError {
  constructor(
    message = 'AI service is not configured',
    context: LlmErrorContext = {},
  ) {
    super('invalid_input', 'ai_not_configured', context, message);
    this.name = 'AiNotConfigured';
  }
}
