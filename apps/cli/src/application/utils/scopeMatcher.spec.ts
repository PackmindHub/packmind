import {
  fileMatchesTargetAndScope,
  buildEffectivePattern,
} from './scopeMatcher';

describe('scopeMatcher', () => {
  describe('fileMatchesTargetAndScope', () => {
    describe('Standard Scope is null', () => {
      describe('when target path is root', () => {
        it('includes all files (Ex 1)', () => {
          const result = fileMatchesTargetAndScope(
            '/frontend/src/file.js',
            '/',
            [],
          );
          expect(result).toBe(true);
        });
      });

      describe('when target path matches file directory', () => {
        it('includes file in target path (Ex 2)', () => {
          const result = fileMatchesTargetAndScope(
            '/frontend/src/file.js',
            '/frontend/src/',
            [],
          );
          expect(result).toBe(true);
        });
      });

      describe('when target path does not match file directory', () => {
        it('excludes file not in target path (Ex 3)', () => {
          const result = fileMatchesTargetAndScope(
            '/frontend/src/file.js',
            '/backend/',
            [],
          );
          expect(result).toBe(false);
        });
      });
    });

    describe('Standard Scope is defined', () => {
      describe('when scope starts with target path', () => {
        it('uses scope alone and includes matching file (Ex 7)', () => {
          const result = fileMatchesTargetAndScope(
            '/backend/src/file.ts',
            '/backend/src',
            ['/backend/src/**/*.ts'],
          );
          expect(result).toBe(true);
        });

        it('excludes file not matching scope pattern', () => {
          const result = fileMatchesTargetAndScope(
            '/backend/other/file.ts',
            '/backend/src',
            ['/backend/src/**/*.ts'],
          );
          expect(result).toBe(false);
        });
      });

      describe('when scope does not start with target path', () => {
        it('concatenates target and scope for glob pattern (Ex 4)', () => {
          const result = fileMatchesTargetAndScope(
            '/backend/test/file.spec.ts',
            '/backend/',
            ['**/*.spec.ts'],
          );
          expect(result).toBe(true);
        });

        it('excludes file not matching concatenated pattern (Ex 5)', () => {
          const result = fileMatchesTargetAndScope(
            '/backend/src/file.ts',
            '/backend/',
            ['test/**/*.spec.ts'],
          );
          expect(result).toBe(false);
        });

        describe('when scope starts with leading slash', () => {
          it('strips leading slash and concatenates with target (Ex 6)', () => {
            const result = fileMatchesTargetAndScope(
              '/backend/test/file.spec.ts',
              '/backend/',
              ['/**/*.spec.ts'],
            );
            expect(result).toBe(true);
          });

          it('handles directory scope with leading slash (Ex 8)', () => {
            const result = fileMatchesTargetAndScope(
              '/backend/src/infra/file.ts',
              '/backend/src',
              ['/infra/'],
            );
            expect(result).toBe(true);
          });

          it('handles pattern scope with leading slash (Ex 9)', () => {
            const result = fileMatchesTargetAndScope(
              '/backend/src/infra/file.ts',
              '/backend/src',
              ['/infra/**/*.ts'],
            );
            expect(result).toBe(true);
          });
        });
      });
    });
  });

  describe('buildEffectivePattern', () => {
    describe('when scope is null and target is root', () => {
      it('returns wildcard pattern', () => {
        expect(buildEffectivePattern('/', null)).toBe('/**');
      });
    });

    describe('when scope is null', () => {
      it('returns target path with wildcard', () => {
        expect(buildEffectivePattern('/backend/', null)).toBe('/backend/**');
      });
    });

    describe('when scope starts with target path', () => {
      it('returns scope alone', () => {
        expect(
          buildEffectivePattern('/backend/src', '/backend/src/**/*.ts'),
        ).toBe('/backend/src/**/*.ts');
      });
    });

    it('strips leading slash from scope and concatenates', () => {
      expect(buildEffectivePattern('/backend', '/**/*.spec.ts')).toBe(
        '/backend/**/*.spec.ts',
      );
    });

    it('concatenates target and scope without leading slash', () => {
      expect(buildEffectivePattern('/backend/', '**/*.spec.ts')).toBe(
        '/backend/**/*.spec.ts',
      );
    });

    it('concatenates target without trailing slash and scope', () => {
      expect(buildEffectivePattern('/backend', 'test/**/*.spec.ts')).toBe(
        '/backend/test/**/*.spec.ts',
      );
    });

    describe('with negative patterns', () => {
      it('preserves ! prefix and builds effective pattern', () => {
        expect(buildEffectivePattern('/backend', '!**/_internal/**')).toBe(
          '!/backend/**/_internal/**',
        );
      });

      it('handles negative pattern with leading slash', () => {
        expect(buildEffectivePattern('/backend', '!/**/_internal/**')).toBe(
          '!/backend/**/_internal/**',
        );
      });

      it('handles negative pattern starting with target path', () => {
        expect(
          buildEffectivePattern('/backend/src', '!/backend/src/**/*.test.ts'),
        ).toBe('!/backend/src/**/*.test.ts');
      });
    });
  });

  describe('negative glob patterns', () => {
    describe('mixed positive and negative patterns', () => {
      it('includes file matching positive but not negative', () => {
        const result = fileMatchesTargetAndScope(
          '/src/components/Button.stories.tsx',
          '/',
          ['**/*.stories.tsx', '!**/_internal/**'],
        );
        expect(result).toBe(true);
      });

      it('excludes file matching both positive and negative', () => {
        const result = fileMatchesTargetAndScope(
          '/src/_internal/Hidden.stories.tsx',
          '/',
          ['**/*.stories.tsx', '!**/_internal/**'],
        );
        expect(result).toBe(false);
      });

      it('excludes file not matching positive pattern', () => {
        const result = fileMatchesTargetAndScope(
          '/src/components/Button.ts',
          '/',
          ['**/*.stories.tsx', '!**/_internal/**'],
        );
        expect(result).toBe(false);
      });
    });

    describe('only negative patterns (no positive)', () => {
      it('returns false because at least one positive pattern is required', () => {
        const result = fileMatchesTargetAndScope(
          '/src/main.ts',
          '/',
          ['!**/test/**'],
        );
        expect(result).toBe(false);
      });
    });

    describe('multiple negative patterns', () => {
      it('excludes file matching first exclusion', () => {
        const result = fileMatchesTargetAndScope(
          '/backend/test/file.ts',
          '/',
          ['**/*.ts', '!**/test/**', '!**/vendor/**'],
        );
        expect(result).toBe(false);
      });

      it('excludes file matching second exclusion', () => {
        const result = fileMatchesTargetAndScope(
          '/backend/vendor/lib.ts',
          '/',
          ['**/*.ts', '!**/test/**', '!**/vendor/**'],
        );
        expect(result).toBe(false);
      });

      it('includes file not matching any exclusion', () => {
        const result = fileMatchesTargetAndScope(
          '/backend/src/main.ts',
          '/',
          ['**/*.ts', '!**/test/**', '!**/vendor/**'],
        );
        expect(result).toBe(true);
      });
    });

    describe('negative pattern with target path concatenation', () => {
      it('correctly applies exclusion within target', () => {
        const result = fileMatchesTargetAndScope(
          '/backend/generated/model.spec.ts',
          '/backend/',
          ['**/*.spec.ts', '!**/generated/**'],
        );
        expect(result).toBe(false);
      });

      it('includes file not matching exclusion within target', () => {
        const result = fileMatchesTargetAndScope(
          '/backend/test/model.spec.ts',
          '/backend/',
          ['**/*.spec.ts', '!**/generated/**'],
        );
        expect(result).toBe(true);
      });
    });

    describe('user reported scenario: designSystem with _internal exclusion', () => {
      it('includes stories outside _internal', () => {
        const result = fileMatchesTargetAndScope(
          '/src/components/designSystem/Button/Button.stories.tsx',
          '/',
          [
            '**/src/components/designSystem/**/*.stories.tsx',
            '!**/src/components/designSystem/**/_internal/**',
          ],
        );
        expect(result).toBe(true);
      });

      it('excludes stories inside _internal', () => {
        const result = fileMatchesTargetAndScope(
          '/src/components/designSystem/core/_internal/Hidden.stories.tsx',
          '/',
          [
            '**/src/components/designSystem/**/*.stories.tsx',
            '!**/src/components/designSystem/**/_internal/**',
          ],
        );
        expect(result).toBe(false);
      });
    });
  });
});
