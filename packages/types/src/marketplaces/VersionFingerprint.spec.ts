import { pluginContentEqual, VersionFingerprint } from './VersionFingerprint';

const fp = (over: Partial<VersionFingerprint> = {}): VersionFingerprint => ({
  recipes: {},
  standards: {},
  skills: {},
  ...over,
});

describe('pluginContentEqual', () => {
  describe('when either side is undefined', () => {
    it('returns false for an undefined first argument', () => {
      expect(pluginContentEqual(undefined, fp())).toBe(false);
    });

    it('returns false for an undefined second argument', () => {
      expect(pluginContentEqual(fp(), undefined)).toBe(false);
    });
  });

  describe('when both fingerprints carry identical maps', () => {
    it('returns true regardless of key order', () => {
      expect(
        pluginContentEqual(
          fp({ recipes: { a: 1, b: 2 } }),
          fp({ recipes: { b: 2, a: 1 } }),
        ),
      ).toBe(true);
    });
  });

  describe('when a version number changed', () => {
    it('returns false', () => {
      expect(
        pluginContentEqual(
          fp({ recipes: { a: 1 } }),
          fp({ recipes: { a: 2 } }),
        ),
      ).toBe(false);
    });
  });

  describe('when an artifact was added or removed', () => {
    it('returns false', () => {
      expect(
        pluginContentEqual(fp({ skills: { s: 1 } }), fp({ skills: {} })),
      ).toBe(false);
    });
  });

  describe('when a standard version changed', () => {
    it('returns true, since a plugin ships none of them', () => {
      expect(
        pluginContentEqual(
          fp({ recipes: { a: 1 }, standards: { s: 4 } }),
          fp({ recipes: { a: 1 }, standards: { s: 5 } }),
        ),
      ).toBe(true);
    });
  });

  describe('when a standard was added to the package', () => {
    it('returns true', () => {
      expect(
        pluginContentEqual(
          fp({ skills: { k: 1 } }),
          fp({ skills: { k: 1 }, standards: { s: 1 } }),
        ),
      ).toBe(true);
    });
  });
});
