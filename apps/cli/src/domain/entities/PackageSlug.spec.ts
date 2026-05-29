import { parsePackageSlug } from './PackageSlug';

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
