import {
  formatPackageVersionSpec,
  parsePackageVersionSpec,
  splitPackageRef,
} from './packageVersionSpec';

describe('packageVersionSpec', () => {
  describe('parsePackageVersionSpec', () => {
    it('reads * as the wildcard', () => {
      expect(parsePackageVersionSpec('*')).toEqual({ kind: 'wildcard' });
    });

    it('reads an X.Y.Z triple as an exact version', () => {
      expect(parsePackageVersionSpec('0.1.0')).toEqual({
        kind: 'exact',
        version: '0.1.0',
      });
    });

    it('returns null for a caret range — ^0.1.0', () => {
      expect(parsePackageVersionSpec('^0.1.0')).toBeNull();
    });

    it('returns null for a tilde range — ~0.1.0', () => {
      expect(parsePackageVersionSpec('~0.1.0')).toBeNull();
    });

    it('returns null for a floating spec — latest', () => {
      expect(parsePackageVersionSpec('latest')).toBeNull();
    });

    it('returns null for a partial version — 1.x', () => {
      expect(parsePackageVersionSpec('1.x')).toBeNull();
    });

    it('returns null for the empty string', () => {
      expect(parsePackageVersionSpec('')).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(parsePackageVersionSpec(undefined)).toBeNull();
    });
  });

  describe('formatPackageVersionSpec', () => {
    it('writes the wildcard as *', () => {
      expect(formatPackageVersionSpec({ kind: 'wildcard' })).toBe('*');
    });

    it('writes an exact spec as its version', () => {
      expect(
        formatPackageVersionSpec({ kind: 'exact', version: '1.2.3' }),
      ).toBe('1.2.3');
    });
  });

  describe('splitPackageRef', () => {
    it('splits the version off a scoped ref', () => {
      expect(splitPackageRef('@space/ops:0.1.0')).toEqual({
        slug: '@space/ops',
        rawSpec: '0.1.0',
      });
    });

    it('splits the version off a bare ref', () => {
      expect(splitPackageRef('ops:*')).toEqual({
        slug: 'ops',
        rawSpec: '*',
      });
    });

    it('reports no spec on a ref that carries none', () => {
      expect(splitPackageRef('@space/ops')).toEqual({
        slug: '@space/ops',
        rawSpec: null,
      });
    });

    it('keeps an empty spec distinct from an absent one', () => {
      expect(splitPackageRef('@space/ops:')).toEqual({
        slug: '@space/ops',
        rawSpec: '',
      });
    });
  });
});
