import { LinterAstAdapter } from './LinterAstAdapter';
import { ParserNotAvailableError } from '../core/ParserError';
import { ProgrammingLanguage } from '@packmind/types';

describe('LinterAstAdapter', () => {
  let adapter: LinterAstAdapter;

  beforeEach(() => {
    adapter = new LinterAstAdapter();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAvailableLanguages', () => {
    it('returns list of supported languages', () => {
      const languages = adapter.getAvailableLanguages();

      expect(languages).toEqual([
        'TYPESCRIPT',
        'TYPESCRIPT_TSX',
        'JAVASCRIPT',
        'JAVASCRIPT_JSX',
        'CPP',
        'GO',
        'KOTLIN',
        'CSS',
        'CSHARP',
        'PHP',
        'PYTHON',
        'RUBY',
        'JSON',
        'HTML',
        'JAVA',
        'SWIFT',
        'SCSS',
        'YAML',
      ]);
    });
  });

  describe('isLanguageSupported', () => {
    it('returns true for TYPESCRIPT', () => {
      expect(
        adapter.isLanguageSupported('TYPESCRIPT' as ProgrammingLanguage),
      ).toBe(true);
    });

    it('returns true for TYPESCRIPT_TSX', () => {
      expect(
        adapter.isLanguageSupported('TYPESCRIPT_TSX' as ProgrammingLanguage),
      ).toBe(true);
    });

    it('returns true for JAVASCRIPT', () => {
      expect(
        adapter.isLanguageSupported('JAVASCRIPT' as ProgrammingLanguage),
      ).toBe(true);
    });

    it('returns true for JAVASCRIPT_JSX', () => {
      expect(
        adapter.isLanguageSupported('JAVASCRIPT_JSX' as ProgrammingLanguage),
      ).toBe(true);
    });

    it('returns true for CPP', () => {
      expect(adapter.isLanguageSupported('CPP' as ProgrammingLanguage)).toBe(
        true,
      );
    });

    it('returns true for JAVA', () => {
      expect(adapter.isLanguageSupported('JAVA' as ProgrammingLanguage)).toBe(
        true,
      );
    });

    it('returns true for PYTHON', () => {
      expect(adapter.isLanguageSupported('PYTHON' as ProgrammingLanguage)).toBe(
        true,
      );
    });

    it('returns true for YAML', () => {
      expect(adapter.isLanguageSupported('YAML' as ProgrammingLanguage)).toBe(
        true,
      );
    });

    it('returns false for GENERIC', () => {
      expect(
        adapter.isLanguageSupported('GENERIC' as ProgrammingLanguage),
      ).toBe(false);
    });
  });

  describe('parseSourceCode', () => {
    it('throws ParserNotAvailableError for unsupported language', async () => {
      await expect(
        adapter.parseSourceCode('code', 'GENERIC' as ProgrammingLanguage),
      ).rejects.toThrow(ParserNotAvailableError);
    });
  });
});
