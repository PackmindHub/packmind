import { stripPrerelease } from './normalizeSemver';

describe('stripPrerelease', () => {
  describe('when the version has no prerelease tag', () => {
    it('returns the version unchanged', () => {
      expect(stripPrerelease('0.28.1')).toBe('0.28.1');
    });
  });

  describe('when the version has a -next prerelease tag', () => {
    it('strips the -next suffix', () => {
      expect(stripPrerelease('0.28.1-next')).toBe('0.28.1');
    });

    it('strips the -next suffix on a multi-digit minor', () => {
      expect(stripPrerelease('1.10.42-next')).toBe('1.10.42');
    });
  });

  describe('when the version is an empty string', () => {
    it('returns an empty string', () => {
      expect(stripPrerelease('')).toBe('');
    });
  });

  describe('when the version is already stripped', () => {
    it('is idempotent', () => {
      const stripped = stripPrerelease('0.28.1-next');
      expect(stripPrerelease(stripped)).toBe('0.28.1');
    });
  });

  describe('when the version has a non-"-next" prerelease tag', () => {
    it('leaves other prerelease tags untouched', () => {
      // The convention is intentionally narrow: only "-next" is stripped.
      expect(stripPrerelease('0.28.1-beta')).toBe('0.28.1-beta');
    });
  });
});
