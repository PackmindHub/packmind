import { createSpaceId } from './Space';

describe('Space entity', () => {
  describe('createSpaceId', () => {
    it('creates a branded SpaceId from string', () => {
      const id = 'test-uuid';
      const spaceId = createSpaceId(id);

      expect(spaceId).toBe(id);
    });

    it('creates different branded SpaceIds', () => {
      const id1 = createSpaceId('uuid-1');
      const id2 = createSpaceId('uuid-2');

      expect(id1).not.toBe(id2);
    });
  });
});
