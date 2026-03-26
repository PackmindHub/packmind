import { resolveSpaceFromArgs } from './spaceFilterUtils';
import { Space } from '@packmind/types';

const spaces: Space[] = [
  { id: 'sp-1', name: 'My Space', slug: 'my-space' } as Space,
  { id: 'sp-2', name: 'Other Space', slug: 'other' } as Space,
];

describe('resolveSpaceFromArgs', () => {
  describe('when spaceArg is undefined', () => {
    it('returns null', () => {
      expect(resolveSpaceFromArgs(undefined, spaces)).toBeNull();
    });
  });

  it('finds space by slug', () => {
    expect(resolveSpaceFromArgs('my-space', spaces)).toEqual(spaces[0]);
  });

  it('strips @ prefix before matching', () => {
    expect(resolveSpaceFromArgs('@my-space', spaces)).toEqual(spaces[0]);
  });

  describe('when no match found', () => {
    it('returns null', () => {
      expect(resolveSpaceFromArgs('nonexistent', spaces)).toBeNull();
    });
  });
});
