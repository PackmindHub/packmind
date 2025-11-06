/**
 * Error thrown when the AI service is not properly configured
 * (e.g., missing API key or other required configuration)
 */
export class AiNotConfigured extends Error {
  constructor(message = 'AI service is not configured') {
    super(message);
    this.name = 'AiNotConfigured';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AiNotConfigured);
    }
  }
}
