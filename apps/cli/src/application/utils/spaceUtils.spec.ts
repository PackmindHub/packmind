import { resolveSpace } from './spaceUtils';
import { Space } from '@packmind/types';

const spaces: Space[] = [
  { id: 'sp-1', name: 'My Space', slug: 'my-space' } as Space,
  { id: 'sp-2', name: 'Other Space', slug: 'other' } as Space,
];

describe('resolveSpace', () => {
  it('returns single space when no slug provided', () => {
    expect(resolveSpace([spaces[0]])).toEqual(spaces[0]);
  });

  it('throws when multiple spaces and no slug', () => {
    expect(() => resolveSpace(spaces)).toThrow('Multiple spaces found');
  });

  it('finds space by slug', () => {
    expect(resolveSpace(spaces, 'my-space')).toEqual(spaces[0]);
  });

  it('strips @ prefix from slug', () => {
    expect(resolveSpace(spaces, '@my-space')).toEqual(spaces[0]);
  });

  it('throws when slug not found', () => {
    expect(() => resolveSpace(spaces, 'nonexistent')).toThrow(
      'Space "nonexistent" not found',
    );
  });
});
