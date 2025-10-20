import {
  ProgrammingLanguage,
  ProgrammingLanguageDetails,
  getAllLanguagesSortedByDisplayName,
  getAllProgrammingLanguages,
  stringToProgrammingLanguage,
} from './Language';

describe('Language', () => {
  describe('getAllLanguagesSortedByDisplayName', () => {
    it('returns all languages sorted by display name', () => {
      const sortedLanguages = getAllLanguagesSortedByDisplayName();

      // Check that all languages are included
      expect(sortedLanguages).toHaveLength(
        Object.keys(ProgrammingLanguage).length,
      );

      // Check that they are sorted by display name
      const displayNames = sortedLanguages.map((item) => item.info.displayName);
      const sortedDisplayNames = [...displayNames].sort((a, b) =>
        a.localeCompare(b),
      );
      expect(displayNames).toEqual(sortedDisplayNames);

      // Check structure of returned objects
      sortedLanguages.forEach((item) => {
        expect(item).toHaveProperty('language');
        expect(item).toHaveProperty('info');
        expect(typeof item.language).toBe('string');
        expect(item.info).toHaveProperty('displayName');
        expect(item.info).toHaveProperty('fileExtensions');
      });
    });

    it('has Bash as the first language alphabetically', () => {
      const sortedLanguages = getAllLanguagesSortedByDisplayName();
      expect(sortedLanguages[0].info.displayName).toBe('Bash');
    });

    it('includes all expected languages', () => {
      const sortedLanguages = getAllLanguagesSortedByDisplayName();
      const languageValues = sortedLanguages.map((item) => item.language);

      const expectedLanguages = Object.values(ProgrammingLanguage);
      expectedLanguages.forEach((language) => {
        expect(languageValues).toContain(language);
      });
    });
  });

  describe('ProgrammingLanguageDetails', () => {
    it('has details for all enum values', () => {
      Object.values(ProgrammingLanguage).forEach((language) => {
        expect(ProgrammingLanguageDetails[language]).toBeDefined();
        expect(ProgrammingLanguageDetails[language].displayName).toBeDefined();
        expect(
          ProgrammingLanguageDetails[language].fileExtensions,
        ).toBeDefined();
      });
    });

    it('has unique display names', () => {
      const displayNames = Object.values(ProgrammingLanguageDetails).map(
        (details) => details.displayName,
      );
      const uniqueDisplayNames = new Set(displayNames);
      expect(uniqueDisplayNames.size).toBe(displayNames.length);
    });

    it('has valid file extensions (no dots, lowercase)', () => {
      Object.values(ProgrammingLanguageDetails).forEach((details) => {
        details.fileExtensions.forEach((ext) => {
          expect(ext).not.toMatch(/^\./); // Should not start with dot
          expect(ext).toBe(ext.toLowerCase()); // Should be lowercase
          expect(ext.length).toBeGreaterThan(0); // Should not be empty
        });
      });
    });
  });

  describe('getAllProgrammingLanguages', () => {
    it('returns all programming language enum values', () => {
      const allLanguages = getAllProgrammingLanguages();

      // Should return an array
      expect(Array.isArray(allLanguages)).toBe(true);

      // Should have the correct number of languages
      expect(allLanguages).toHaveLength(
        Object.keys(ProgrammingLanguage).length,
      );

      // Should contain all enum values
      const expectedLanguages = Object.values(ProgrammingLanguage);
      expectedLanguages.forEach((language) => {
        expect(allLanguages).toContain(language);
      });
    });

    it('returns an array of ProgrammingLanguage values', () => {
      const allLanguages = getAllProgrammingLanguages();

      allLanguages.forEach((language) => {
        expect(typeof language).toBe('string');
        expect(Object.values(ProgrammingLanguage)).toContain(language);
      });
    });

    it('includes all expected languages', () => {
      const allLanguages = getAllProgrammingLanguages();

      expect(allLanguages).toContain(ProgrammingLanguage.JAVASCRIPT);
      expect(allLanguages).toContain(ProgrammingLanguage.JAVASCRIPT_JSX);
      expect(allLanguages).toContain(ProgrammingLanguage.TYPESCRIPT);
      expect(allLanguages).toContain(ProgrammingLanguage.TYPESCRIPT_TSX);
      expect(allLanguages).toContain(ProgrammingLanguage.PYTHON);
      expect(allLanguages).toContain(ProgrammingLanguage.PHP);
      expect(allLanguages).toContain(ProgrammingLanguage.JAVA);
      expect(allLanguages).toContain(ProgrammingLanguage.SCSS);
      expect(allLanguages).toContain(ProgrammingLanguage.HTML);
      expect(allLanguages).toContain(ProgrammingLanguage.CSHARP);
      expect(allLanguages).toContain(ProgrammingLanguage.GO);
      expect(allLanguages).toContain(ProgrammingLanguage.CPP);
      expect(allLanguages).toContain(ProgrammingLanguage.SQL);
    });

    it('does not have duplicate values', () => {
      const allLanguages = getAllProgrammingLanguages();
      const uniqueLanguages = new Set(allLanguages);
      expect(uniqueLanguages.size).toBe(allLanguages.length);
    });
  });

  describe('stringToProgrammingLanguage', () => {
    describe('enum value matches', () => {
      it('matches exact enum values case-insensitively', () => {
        expect(stringToProgrammingLanguage('JAVASCRIPT')).toBe(
          ProgrammingLanguage.JAVASCRIPT,
        );
        expect(stringToProgrammingLanguage('javascript')).toBe(
          ProgrammingLanguage.JAVASCRIPT,
        );
        expect(stringToProgrammingLanguage('JavaScript')).toBe(
          ProgrammingLanguage.JAVASCRIPT,
        );
        expect(stringToProgrammingLanguage('TYPESCRIPT')).toBe(
          ProgrammingLanguage.TYPESCRIPT,
        );
        expect(stringToProgrammingLanguage('typescript')).toBe(
          ProgrammingLanguage.TYPESCRIPT,
        );
      });
    });

    describe('display name matches', () => {
      it('matches display names case-insensitively', () => {
        expect(stringToProgrammingLanguage('JavaScript')).toBe(
          ProgrammingLanguage.JAVASCRIPT,
        );
        expect(stringToProgrammingLanguage('javascript')).toBe(
          ProgrammingLanguage.JAVASCRIPT,
        );
        expect(stringToProgrammingLanguage('TypeScript')).toBe(
          ProgrammingLanguage.TYPESCRIPT,
        );
        expect(stringToProgrammingLanguage('typescript')).toBe(
          ProgrammingLanguage.TYPESCRIPT,
        );
        expect(stringToProgrammingLanguage('Python')).toBe(
          ProgrammingLanguage.PYTHON,
        );
        expect(stringToProgrammingLanguage('python')).toBe(
          ProgrammingLanguage.PYTHON,
        );
        expect(stringToProgrammingLanguage('C#')).toBe(
          ProgrammingLanguage.CSHARP,
        );
        expect(stringToProgrammingLanguage('c#')).toBe(
          ProgrammingLanguage.CSHARP,
        );
        expect(stringToProgrammingLanguage('C++')).toBe(
          ProgrammingLanguage.CPP,
        );
        expect(stringToProgrammingLanguage('c++')).toBe(
          ProgrammingLanguage.CPP,
        );
      });
    });

    describe('file extension matches', () => {
      it('matches file extensions case-insensitively', () => {
        expect(stringToProgrammingLanguage('js')).toBe(
          ProgrammingLanguage.JAVASCRIPT,
        );
        expect(stringToProgrammingLanguage('JS')).toBe(
          ProgrammingLanguage.JAVASCRIPT,
        );
        expect(stringToProgrammingLanguage('jsx')).toBe(
          ProgrammingLanguage.JAVASCRIPT_JSX,
        );
        expect(stringToProgrammingLanguage('ts')).toBe(
          ProgrammingLanguage.TYPESCRIPT,
        );
        expect(stringToProgrammingLanguage('tsx')).toBe(
          ProgrammingLanguage.TYPESCRIPT_TSX,
        );
        expect(stringToProgrammingLanguage('py')).toBe(
          ProgrammingLanguage.PYTHON,
        );
        expect(stringToProgrammingLanguage('go')).toBe(ProgrammingLanguage.GO);
        expect(stringToProgrammingLanguage('cpp')).toBe(
          ProgrammingLanguage.CPP,
        );
        expect(stringToProgrammingLanguage('sql')).toBe(
          ProgrammingLanguage.SQL,
        );
      });

      it('matches multiple C++ extensions', () => {
        expect(stringToProgrammingLanguage('cpp')).toBe(
          ProgrammingLanguage.CPP,
        );
        expect(stringToProgrammingLanguage('cc')).toBe(ProgrammingLanguage.CPP);
        expect(stringToProgrammingLanguage('cxx')).toBe(
          ProgrammingLanguage.CPP,
        );
        expect(stringToProgrammingLanguage('c++')).toBe(
          ProgrammingLanguage.CPP,
        );
        expect(stringToProgrammingLanguage('h')).toBe(ProgrammingLanguage.C);
        expect(stringToProgrammingLanguage('hpp')).toBe(
          ProgrammingLanguage.CPP,
        );
        expect(stringToProgrammingLanguage('hxx')).toBe(
          ProgrammingLanguage.CPP,
        );
      });
    });

    describe('edge cases', () => {
      it('handles whitespace', () => {
        expect(stringToProgrammingLanguage('  JavaScript  ')).toBe(
          ProgrammingLanguage.JAVASCRIPT,
        );
        expect(stringToProgrammingLanguage('\tTypeScript\n')).toBe(
          ProgrammingLanguage.TYPESCRIPT,
        );
      });

      it('throws error for empty input', () => {
        expect(() => stringToProgrammingLanguage('')).toThrow(
          'Language input cannot be empty',
        );
        expect(() => stringToProgrammingLanguage('   ')).toThrow(
          'Language input cannot be empty',
        );
      });

      it('throws error for unknown language', () => {
        expect(() => stringToProgrammingLanguage('unknown')).toThrow(
          'Unknown programming language: "unknown"',
        );
        expect(() => stringToProgrammingLanguage('cobol')).toThrow(
          'Unknown programming language: "cobol"',
        );
      });

      it('includes available languages in error message', () => {
        try {
          stringToProgrammingLanguage('unknown');
        } catch (error) {
          expect(error instanceof Error).toBe(true);
          expect((error as Error).message).toContain('Available languages:');
          expect((error as Error).message).toContain('JavaScript');
          expect((error as Error).message).toContain('Python');
        }
      });
    });

    describe('migration compatibility', () => {
      it('handles the old "TypeScript" default value', () => {
        expect(stringToProgrammingLanguage('TypeScript')).toBe(
          ProgrammingLanguage.TYPESCRIPT,
        );
      });

      it('handles common string variations that might exist in database', () => {
        expect(stringToProgrammingLanguage('javascript')).toBe(
          ProgrammingLanguage.JAVASCRIPT,
        );
        expect(stringToProgrammingLanguage('typescript')).toBe(
          ProgrammingLanguage.TYPESCRIPT,
        );
        expect(stringToProgrammingLanguage('python')).toBe(
          ProgrammingLanguage.PYTHON,
        );
      });
    });
  });
});
