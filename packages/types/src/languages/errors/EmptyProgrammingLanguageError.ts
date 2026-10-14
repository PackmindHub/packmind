import { ProgrammingLanguageError } from './ProgrammingLanguageError';

export class EmptyProgrammingLanguageError extends ProgrammingLanguageError {
  constructor() {
    super(
      'invalid_input',
      'empty_programming_language',
      {},
      'Language input cannot be empty',
    );
    this.name = 'EmptyProgrammingLanguageError';
  }
}
