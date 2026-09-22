import { validatePackageReleaseVersion } from './packageReleaseVersionRules';
import { InvalidPackageReleaseVersionError } from './InvalidPackageReleaseVersionError';

describe('packageReleaseVersionRules', () => {
  describe('malformed', () => {
    it('refuses comma separators', () => {
      expect(validatePackageReleaseVersion('1,2,3', '0.0.0')).toBe('malformed');
    });

    it('refuses a pre-release', () => {
      expect(validatePackageReleaseVersion('1.2.0-beta-2', '0.0.0')).toBe(
        'malformed',
      );
    });

    it('refuses a leading zero', () => {
      expect(validatePackageReleaseVersion('01.2.3', '0.0.0')).toBe(
        'malformed',
      );
    });

    it('refuses too few parts', () => {
      expect(validatePackageReleaseVersion('1.2', '0.0.0')).toBe('malformed');
    });

    it('refuses too many parts', () => {
      expect(validatePackageReleaseVersion('1.2.3.4', '0.0.0')).toBe(
        'malformed',
      );
    });

    it('refuses the empty string', () => {
      expect(validatePackageReleaseVersion('', '0.0.0')).toBe('malformed');
    });

    it('refuses a missing version', () => {
      expect(validatePackageReleaseVersion(undefined, '0.0.0')).toBe(
        'malformed',
      );
    });

    it('refuses a non-string version', () => {
      expect(validatePackageReleaseVersion(123, '0.0.0')).toBe('malformed');
    });

    it('refuses surrounding whitespace', () => {
      expect(validatePackageReleaseVersion(' 1.2.3 ', '0.0.0')).toBe(
        'malformed',
      );
    });
  });

  describe('not_greater', () => {
    it('refuses a version lower than the current one', () => {
      expect(validatePackageReleaseVersion('1.1.0', '1.2.0')).toBe(
        'not_greater',
      );
    });

    it('refuses a version equal to the current one', () => {
      expect(validatePackageReleaseVersion('1.2.0', '1.2.0')).toBe(
        'not_greater',
      );
    });

    it('refuses a lower version with not_greater rather than not_an_increment', () => {
      const result = validatePackageReleaseVersion('1.1.0', '1.2.0');
      expect(result).toBe('not_greater');
    });
  });

  describe('not_an_increment', () => {
    it('refuses a well-formed, greater, non-increment version', () => {
      expect(validatePackageReleaseVersion('0.5.0', '0.1.0')).toBe(
        'not_an_increment',
      );
    });

    it('refuses a non-increment version across major', () => {
      expect(validatePackageReleaseVersion('2.0.1', '1.2.0')).toBe(
        'not_an_increment',
      );
    });
  });

  describe('accepted', () => {
    it('accepts the patch increment', () => {
      expect(validatePackageReleaseVersion('0.1.1', '0.1.0')).toBe(null);
    });

    it('accepts the minor increment', () => {
      expect(validatePackageReleaseVersion('0.2.0', '0.1.0')).toBe(null);
    });

    it('accepts the major increment', () => {
      expect(validatePackageReleaseVersion('1.0.0', '0.1.0')).toBe(null);
    });
  });

  describe('the first release, current 0.0.0', () => {
    it('accepts 0.0.1 over 0.0.0', () => {
      expect(validatePackageReleaseVersion('0.0.1', '0.0.0')).toBe(null);
    });

    it('accepts 0.1.0 over 0.0.0', () => {
      expect(validatePackageReleaseVersion('0.1.0', '0.0.0')).toBe(null);
    });

    it('accepts 1.0.0 over 0.0.0', () => {
      expect(validatePackageReleaseVersion('1.0.0', '0.0.0')).toBe(null);
    });

    it('refuses 0.2.0 over 0.0.0 as not_an_increment', () => {
      expect(validatePackageReleaseVersion('0.2.0', '0.0.0')).toBe(
        'not_an_increment',
      );
    });
  });

  describe('the ordering trap', () => {
    it('accepts 0.10.0 over current 0.9.0', () => {
      expect(validatePackageReleaseVersion('0.10.0', '0.9.0')).toBe(null);
    });
  });

  describe('when the current version does not parse', () => {
    it('throws InvalidPackageReleaseVersionError', () => {
      expect(() => validatePackageReleaseVersion('1.0.0', 'banana')).toThrow(
        InvalidPackageReleaseVersionError,
      );
    });
  });
});
