import { createStandardId } from '@packmind/types';

describe('Standard', () => {
  describe('createStandardId', () => {
    let id: ReturnType<typeof createStandardId>;

    beforeEach(() => {
      id = createStandardId('test-id');
    });

    it('returns a defined value', () => {
      expect(id).toBeDefined();
    });

    it('returns a string type', () => {
      expect(typeof id).toBe('string');
    });

    it('returns the provided ID value', () => {
      expect(id).toBe('test-id');
    });
  });
});
