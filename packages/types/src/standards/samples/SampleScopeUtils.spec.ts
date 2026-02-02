import { ProgrammingLanguage } from '../../languages';
import { languagesToGlobPattern, getSampleScope } from './SampleScopeUtils';

describe('SampleScopeUtils', () => {
  describe('languagesToGlobPattern', () => {
    describe('with single language', () => {
      it('converts typescript to glob pattern', () => {
        const result = languagesToGlobPattern([ProgrammingLanguage.TYPESCRIPT]);

        expect(result).toBe('**/*.ts');
      });

      it('converts java to glob pattern', () => {
        const result = languagesToGlobPattern([ProgrammingLanguage.JAVA]);

        expect(result).toBe('**/*.java');
      });
    });

    describe('with multi-extension language', () => {
      it('converts python to multiple glob patterns', () => {
        const result = languagesToGlobPattern([ProgrammingLanguage.PYTHON]);

        expect(result).toBe('**/*.py,**/*.pyx,**/*.pyw');
      });

      it('converts cpp to multiple glob patterns', () => {
        const result = languagesToGlobPattern([ProgrammingLanguage.CPP]);

        expect(result).toBe(
          '**/*.cpp,**/*.cc,**/*.cxx,**/*.c++,**/*.hpp,**/*.hxx',
        );
      });
    });

    describe('with multiple languages', () => {
      it('combines patterns from all languages', () => {
        const result = languagesToGlobPattern([
          ProgrammingLanguage.TYPESCRIPT,
          ProgrammingLanguage.JAVASCRIPT,
        ]);

        expect(result).toBe('**/*.ts,**/*.js');
      });

      it('preserves order of languages', () => {
        const result = languagesToGlobPattern([
          ProgrammingLanguage.TYPESCRIPT_TSX,
          ProgrammingLanguage.JAVASCRIPT_JSX,
          ProgrammingLanguage.TYPESCRIPT,
          ProgrammingLanguage.JAVASCRIPT,
        ]);

        expect(result).toBe('**/*.tsx,**/*.jsx,**/*.ts,**/*.js');
      });
    });

    describe('with empty array', () => {
      it('returns empty string', () => {
        const result = languagesToGlobPattern([]);

        expect(result).toBe('');
      });
    });
  });

  describe('getSampleScope', () => {
    describe('with language samples', () => {
      it('returns glob pattern for typescript', () => {
        const result = getSampleScope('typescript', 'language');

        expect(result).toBe('**/*.ts');
      });

      it('returns glob pattern for python with all extensions', () => {
        const result = getSampleScope('python', 'language');

        expect(result).toBe('**/*.py,**/*.pyx,**/*.pyw');
      });

      it('returns glob pattern for cpp with all extensions', () => {
        const result = getSampleScope('cpp', 'language');

        expect(result).toBe(
          '**/*.cpp,**/*.cc,**/*.cxx,**/*.c++,**/*.hpp,**/*.hxx',
        );
      });
    });

    describe('with framework samples', () => {
      it('returns combined pattern for react', () => {
        const result = getSampleScope('react', 'framework');

        expect(result).toBe('**/*.tsx,**/*.jsx,**/*.ts,**/*.js');
      });

      it('returns combined pattern for vue', () => {
        const result = getSampleScope('vue', 'framework');

        expect(result).toBe('**/*.vue,**/*.ts,**/*.js');
      });

      it('returns combined pattern for express', () => {
        const result = getSampleScope('express', 'framework');

        expect(result).toBe('**/*.ts,**/*.js');
      });
    });

    describe('with hardcoded patterns', () => {
      it('returns hardcoded pattern first for svelte', () => {
        const result = getSampleScope('svelte', 'framework');

        expect(result).toBe('**/*.svelte,**/*.ts,**/*.js');
      });

      it('returns only hardcoded pattern for terraform', () => {
        const result = getSampleScope('terraform', 'framework');

        expect(result).toBe('**/*.tf');
      });

      it('returns only hardcoded pattern for flutter', () => {
        const result = getSampleScope('flutter', 'framework');

        expect(result).toBe('**/*.dart');
      });
    });

    describe('with unknown sample', () => {
      it('returns null for unknown language sample', () => {
        const result = getSampleScope('unknown-language', 'language');

        expect(result).toBeNull();
      });

      it('returns null for unknown framework sample', () => {
        const result = getSampleScope('unknown-framework', 'framework');

        expect(result).toBeNull();
      });
    });
  });
});
