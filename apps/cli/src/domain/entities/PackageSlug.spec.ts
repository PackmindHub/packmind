import { displayableParsedPackageRef, parsePackageSlug } from './PackageSlug';

describe('parsePackageSlug', () => {
  describe('when using the simple syntax (eg: "my-package")', () => {
    it('returns an empty spaceSlug and the package slug', () => {
      expect(parsePackageSlug('my-package')).toEqual({
        packageSlug: 'my-package',
      });
    });
  });

  describe('when using the space/package syntax', () => {
    it('returns both slugs', () => {
      expect(parsePackageSlug('my-space/my-package')).toEqual({
        spaceSlug: 'my-space',
        packageSlug: 'my-package',
      });
    });
  });

  describe('when using the @space/package syntax', () => {
    it('returns both slugs and strips the @ in the space slug', () => {
      expect(parsePackageSlug('@my-space/my-package')).toEqual({
        spaceSlug: 'my-space',
        packageSlug: 'my-package',
      });
    });
  });

  it('throws an error if there are more than two slugs', () => {
    expect(() => parsePackageSlug('my-orga/my-space/my-package')).toThrow();
  });
});

describe('parsePackageSlug with a version', () => {
  describe('when a version is typed after the slug', () => {
    it('reads it as an exact spec', () => {
      expect(parsePackageSlug('@my-space/my-package:1.2.3')).toEqual({
        spaceSlug: 'my-space',
        packageSlug: 'my-package',
        versionSpec: { kind: 'exact', version: '1.2.3' },
      });
    });
  });

  describe('when the wildcard is typed after the slug', () => {
    it('reads it as the wildcard spec', () => {
      expect(parsePackageSlug('@my-space/my-package:*')).toEqual({
        spaceSlug: 'my-space',
        packageSlug: 'my-package',
        versionSpec: { kind: 'wildcard' },
      });
    });
  });

  describe('when no version is typed', () => {
    it('carries no spec, which is not the wildcard', () => {
      expect(
        parsePackageSlug('@my-space/my-package').versionSpec,
      ).toBeUndefined();
    });
  });

  describe('when the version is not one this supports', () => {
    it('refuses a range rather than reading it as the live package', () => {
      expect(() => parsePackageSlug('@my-space/my-package:^1.2.3')).toThrow(
        'Invalid version "^1.2.3" for @my-space/my-package. Use an exact version like 1.2.3, or "*" to follow the package as it changes.',
      );
    });
  });
});

describe('displayableParsedPackageRef', () => {
  it('writes the version back beside the slug', () => {
    expect(
      displayableParsedPackageRef(
        parsePackageSlug('@my-space/my-package:1.2.3'),
      ),
    ).toBe('@my-space/my-package:1.2.3');
  });

  it('writes the slug alone when no version was typed', () => {
    expect(
      displayableParsedPackageRef(parsePackageSlug('@my-space/my-package')),
    ).toBe('@my-space/my-package');
  });
});
