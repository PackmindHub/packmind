import { parsePackageSlug } from './packageSlugHelpers';

describe('parsePackageSlug', () => {
  it('extracts space and package slugs from @space/package format', () => {
    expect(parsePackageSlug('@my-space/my-package')).toEqual({
      spaceSlug: 'my-space',
      packageSlug: 'my-package',
    });
  });

  describe('when no prefix', () => {
    it('returns bare slug with null space', () => {
      expect(parsePackageSlug('my-package')).toEqual({
        spaceSlug: null,
        packageSlug: 'my-package',
      });
    });
  });

  it('treats @space without slash as bare slug', () => {
    expect(parsePackageSlug('@space')).toEqual({
      spaceSlug: null,
      packageSlug: '@space',
    });
  });

  it('handles empty string', () => {
    expect(parsePackageSlug('')).toEqual({
      spaceSlug: null,
      packageSlug: '',
    });
  });

  it('handles slug with multiple slashes', () => {
    expect(parsePackageSlug('@space/pkg/extra')).toEqual({
      spaceSlug: 'space',
      packageSlug: 'pkg/extra',
    });
  });
});
