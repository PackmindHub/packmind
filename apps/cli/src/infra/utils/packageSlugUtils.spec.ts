import { parsePackageSlug } from './packageSlugUtils';

describe('parsePackageSlug', () => {
  it('parses @space/pkg format', () => {
    expect(parsePackageSlug('@global/backend')).toEqual({
      spaceSlug: 'global',
      pkgSlug: 'backend',
    });
  });

  it('returns null for bare slug', () => {
    expect(parsePackageSlug('backend')).toBeNull();
  });

  it('returns null for @space with no pkg', () => {
    expect(parsePackageSlug('@global')).toBeNull();
  });

  it('handles nested slugs', () => {
    expect(parsePackageSlug('@space/pkg/extra')).toEqual({
      spaceSlug: 'space',
      pkgSlug: 'pkg/extra',
    });
  });
});
