import { LinterAstInternalError } from './LinterAstInternalError';

export class ParserNotAvailableError extends LinterAstInternalError {
  public readonly originalError?: Error;

  constructor(language: string, cause?: Error) {
    super(
      'parser_not_available',
      { language },
      `Parser for ${language} not available`,
    );
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
