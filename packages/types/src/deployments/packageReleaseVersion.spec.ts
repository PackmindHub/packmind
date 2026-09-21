import { InvalidPackageReleaseVersionError } from './InvalidPackageReleaseVersionError';
import {
  comparePackageReleaseVersions,
  formatPackageReleaseVersion,
  nextVersions,
  parsePackageReleaseVersion,
  type PackageReleaseVersion,
} from './packageReleaseVersion';

describe('packageReleaseVersion', () => {
  describe('parsePackageReleaseVersion', () => {
    it('parses a well-formed 1.2.3 into { major: 1, minor: 2, patch: 3 }', () => {
      expect(parsePackageReleaseVersion('1.2.3')).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
      });
    });

    it('parses 0.0.0', () => {
      expect(parsePackageReleaseVersion('0.0.0')).toEqual({
        major: 0,
        minor: 0,
        patch: 0,
      });
    });

    it('returns null for a leading zero — 01.2.3', () => {
      expect(parsePackageReleaseVersion('01.2.3')).toBeNull();
    });

    it('returns null for a pre-release — 1.2.0-beta-2', () => {
      expect(parsePackageReleaseVersion('1.2.0-beta-2')).toBeNull();
    });

    it('returns null for comma separators — 1,2,3', () => {
      expect(parsePackageReleaseVersion('1,2,3')).toBeNull();
    });

    it('returns null for too few parts — 1.2', () => {
      expect(parsePackageReleaseVersion('1.2')).toBeNull();
    });

    it('returns null for too many parts — 1.2.3.4', () => {
      expect(parsePackageReleaseVersion('1.2.3.4')).toBeNull();
    });

    it('returns null for surrounding whitespace — " 1.2.3 "', () => {
      expect(parsePackageReleaseVersion(' 1.2.3 ')).toBeNull();
    });

    it('returns null for the empty string', () => {
      expect(parsePackageReleaseVersion('')).toBeNull();
    });
  });

  describe('formatPackageReleaseVersion', () => {
    it('formats { major: 1, minor: 2, patch: 3 } to 1.2.3', () => {
      expect(
        formatPackageReleaseVersion({ major: 1, minor: 2, patch: 3 }),
      ).toBe('1.2.3');
    });

    it('formats { major: 0, minor: 0, patch: 0 } to 0.0.0', () => {
      expect(
        formatPackageReleaseVersion({ major: 0, minor: 0, patch: 0 }),
      ).toBe('0.0.0');
    });

    it('formats large numbers correctly', () => {
      expect(
        formatPackageReleaseVersion({ major: 10, minor: 20, patch: 30 }),
      ).toBe('10.20.30');
    });
  });

  describe('comparePackageReleaseVersions', () => {
    it('orders 0.10.0 above 0.9.0', () => {
      const a: PackageReleaseVersion = { major: 0, minor: 10, patch: 0 };
      const b: PackageReleaseVersion = { major: 0, minor: 9, patch: 0 };
      expect(comparePackageReleaseVersions(a, b)).toBeGreaterThan(0);
    });

    it('returns 0 for two equal triples', () => {
      const a: PackageReleaseVersion = { major: 1, minor: 2, patch: 3 };
      const b: PackageReleaseVersion = { major: 1, minor: 2, patch: 3 };
      expect(comparePackageReleaseVersions(a, b)).toBe(0);
    });

    it('orders by major before minor', () => {
      const a: PackageReleaseVersion = { major: 2, minor: 0, patch: 0 };
      const b: PackageReleaseVersion = { major: 1, minor: 100, patch: 100 };
      expect(comparePackageReleaseVersions(a, b)).toBeGreaterThan(0);
    });

    it('orders by minor before patch', () => {
      const a: PackageReleaseVersion = { major: 1, minor: 2, patch: 0 };
      const b: PackageReleaseVersion = { major: 1, minor: 1, patch: 100 };
      expect(comparePackageReleaseVersions(a, b)).toBeGreaterThan(0);
    });

    describe('when the first is less than the second', () => {
      it('returns negative', () => {
        const a: PackageReleaseVersion = { major: 1, minor: 2, patch: 3 };
        const b: PackageReleaseVersion = { major: 1, minor: 2, patch: 4 };
        expect(comparePackageReleaseVersions(a, b)).toBeLessThan(0);
      });
    });
  });

  describe('nextVersions', () => {
    it('returns ["0.1.1", "0.2.0", "1.0.0"] for "0.1.0"', () => {
      expect(nextVersions('0.1.0')).toEqual(['0.1.1', '0.2.0', '1.0.0']);
    });

    it('returns ["0.0.1", "0.1.0", "1.0.0"] for "0.0.0"', () => {
      expect(nextVersions('0.0.0')).toEqual(['0.0.1', '0.1.0', '1.0.0']);
    });

    it('returns ["1.2.4", "1.3.0", "2.0.0"] for "1.2.3"', () => {
      expect(nextVersions('1.2.3')).toEqual(['1.2.4', '1.3.0', '2.0.0']);
    });

    describe('when the argument does not parse', () => {
      it('throws InvalidPackageReleaseVersionError', () => {
        expect(() => nextVersions('1.2.3.4')).toThrow(
          InvalidPackageReleaseVersionError,
        );
      });

      it('names the version it refused', () => {
        expect(() => nextVersions('1.2.3.4')).toThrow(
          'Not a package release version: 1.2.3.4',
        );
      });
    });

    describe('the order the three are returned in', () => {
      const [patch, minor, major] = nextVersions('2.5.8');

      it('puts the patch increment first', () => {
        expect(parsePackageReleaseVersion(patch)).toEqual({
          major: 2,
          minor: 5,
          patch: 9,
        });
      });

      it('puts the minor increment second', () => {
        expect(parsePackageReleaseVersion(minor)).toEqual({
          major: 2,
          minor: 6,
          patch: 0,
        });
      });

      it('puts the major increment third', () => {
        expect(parsePackageReleaseVersion(major)).toEqual({
          major: 3,
          minor: 0,
          patch: 0,
        });
      });
    });
  });
});
