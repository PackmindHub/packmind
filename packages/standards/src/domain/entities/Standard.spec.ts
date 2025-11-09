import { createStandardId } from '@packmind/types';

describe('Standard', () => {
  it('creates a standard ID', () => {
    const id = createStandardId('test-id');
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(id).toBe('test-id');
  });
});
