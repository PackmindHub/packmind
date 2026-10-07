import {
  ProgrammingLanguage,
  stringToProgrammingLanguage,
} from './ProgrammingLanguage';
import {
  EmptyProgrammingLanguageError,
  UnknownProgrammingLanguageError,
} from './errors';
import { isDomainError } from '../errors';

describe('stringToProgrammingLanguage', () => {
  it('resolves an enum value case-insensitively', () => {
    expect(stringToProgrammingLanguage('typescript')).toBe(
      ProgrammingLanguage.TYPESCRIPT,
    );
  });

  describe('when the input is blank', () => {
    const parse = () => stringToProgrammingLanguage('   ');

    it('throws EmptyProgrammingLanguageError', () => {
      expect(parse).toThrow(EmptyProgrammingLanguageError);
    });

    it('throws an invalid_input domain error', () => {
      expect(parse).toThrow(
        expect.objectContaining({
          kind: 'invalid_input',
          reason: 'empty_programming_language',
        }),
      );
    });
  });

  describe('when the input matches no language', () => {
    let error: unknown;

    beforeEach(() => {
      try {
        stringToProgrammingLanguage(' klingon ');
      } catch (thrown) {
        error = thrown;
      }
    });

    it('throws UnknownProgrammingLanguageError', () => {
      expect(error).toBeInstanceOf(UnknownProgrammingLanguageError);
    });

    it('is a domain error', () => {
      expect(isDomainError(error)).toBe(true);
    });

    it('answers with the invalid_input kind', () => {
      expect(error).toMatchObject({
        kind: 'invalid_input',
        reason: 'unknown_programming_language',
      });
    });

    it('carries the trimmed input in its context', () => {
      expect(error).toMatchObject({ context: { input: 'klingon' } });
    });

    it('names the input back to the caller', () => {
      expect((error as Error).message).toMatch(
        /^Unknown programming language: "klingon"\. Available languages: /,
      );
    });
  });
});
