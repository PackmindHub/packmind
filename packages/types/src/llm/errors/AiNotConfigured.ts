export class AiNotConfigured extends Error {
  constructor(message = 'AI service is not configured') {
    super(message);
    this.name = 'AiNotConfigured';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AiNotConfigured);
    }
  }
}
