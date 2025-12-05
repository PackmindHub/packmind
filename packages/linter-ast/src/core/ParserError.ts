export class ParserNotAvailableError extends Error {
  public readonly originalError?: Error;

  constructor(language: string, cause?: Error) {
    super(`Parser for ${language} not available`);
    this.name = 'ParserNotAvailableError';
    this.originalError = cause;
  }
}

export class ParserInitializationError extends Error {
  public readonly originalError?: Error;

  constructor(language: string, message: string, cause?: Error) {
    super(`Failed to initialize parser for ${language}: ${message}`);
    this.name = 'ParserInitializationError';
    this.originalError = cause;
  }
}
