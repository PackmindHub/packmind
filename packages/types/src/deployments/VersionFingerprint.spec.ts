import {
  versionFingerprintsEqual,
  VersionFingerprint,
} from './VersionFingerprint';

const fp = (over: Partial<VersionFingerprint> = {}): VersionFingerprint => ({
  recipes: {},
  standards: {},
  skills: {},
  ...over,
});

describe('versionFingerprintsEqual', () => {
  describe('when either side is undefined', () => {
    it('returns false for an undefined first argument', () => {
      expect(versionFingerprintsEqual(undefined, fp())).toBe(false);
    });

    it('returns false for an undefined second argument', () => {
      expect(versionFingerprintsEqual(fp(), undefined)).toBe(false);
    });
  });

  describe('when both fingerprints carry identical maps', () => {
    it('returns true regardless of key order', () => {
      expect(
        versionFingerprintsEqual(
          fp({ recipes: { a: 1, b: 2 } }),
          fp({ recipes: { b: 2, a: 1 } }),
        ),
      ).toBe(true);
    });
  });

  describe('when a version number changed', () => {
    it('returns false', () => {
      expect(
        versionFingerprintsEqual(
          fp({ recipes: { a: 1 } }),
          fp({ recipes: { a: 2 } }),
        ),
      ).toBe(false);
    });
  });

  describe('when an artifact was added or removed', () => {
    it('returns false', () => {
      expect(
        versionFingerprintsEqual(fp({ skills: { s: 1 } }), fp({ skills: {} })),
      ).toBe(false);
    });
  });
});
