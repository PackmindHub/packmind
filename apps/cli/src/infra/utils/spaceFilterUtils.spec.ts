import { resolveSpaceFromArgs } from './spaceFilterUtils';
import { Space } from '@packmind/types';

const spaces: Space[] = [
  { id: 'sp-1', name: 'My Space', slug: 'my-space' } as Space,
  { id: 'sp-2', name: 'Other Space', slug: 'other' } as Space,
];

describe('resolveSpaceFromArgs', () => {
  it('returns null when spaceArg is undefined', () => {
    expect(resolveSpaceFromArgs(undefined, spaces)).toBeNull();
  });

  it('finds space by slug', () => {
    expect(resolveSpaceFromArgs('my-space', spaces)).toEqual(spaces[0]);
  });

  it('strips @ prefix before matching', () => {
    expect(resolveSpaceFromArgs('@my-space', spaces)).toEqual(spaces[0]);
  });

  it('returns null when no match found', () => {
    expect(resolveSpaceFromArgs('nonexistent', spaces)).toBeNull();
  });
});
