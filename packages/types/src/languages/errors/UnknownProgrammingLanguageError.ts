import { ProgrammingLanguageError } from './ProgrammingLanguageError';

/** The input is named back because the caller supplied it. */
export class UnknownProgrammingLanguageError extends ProgrammingLanguageError {
  constructor(
    public readonly input: string,
    availableLanguages: string,
  ) {
    super(
      'invalid_input',
      'unknown_programming_language',
      { input },
      `Unknown programming language: "${input}". Available languages: ${availableLanguages}`,
    );
    this.name = 'UnknownProgrammingLanguageError';
  }
}
