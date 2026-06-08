import { sortSpacesByName } from './sortSpacesByName';

describe('sortSpacesByName', () => {
  describe('with a reverse-sorted array', () => {
    it('returns items sorted ascending by name', () => {
      const input = [{ name: 'Zebra' }, { name: 'Monkey' }, { name: 'Apple' }];

      expect(sortSpacesByName(input)).toEqual([
        { name: 'Apple' },
        { name: 'Monkey' },
        { name: 'Zebra' },
      ]);
    });
  });

  describe('with an already-sorted array', () => {
    it('preserves the existing order', () => {
      const input = [{ name: 'Alpha' }, { name: 'Beta' }, { name: 'Gamma' }];

      expect(sortSpacesByName(input)).toEqual([
        { name: 'Alpha' },
        { name: 'Beta' },
        { name: 'Gamma' },
      ]);
    });
  });

  describe('with an empty array', () => {
    it('returns an empty array', () => {
      expect(sortSpacesByName([])).toEqual([]);
    });
  });

  describe('with a single-item array', () => {
    it('returns the item unchanged', () => {
      expect(sortSpacesByName([{ name: 'Alpha' }])).toEqual([
        { name: 'Alpha' },
      ]);
    });
  });

  describe('with mixed-case names', () => {
    it('sorts case-insensitively using base sensitivity', () => {
      const input = [{ name: 'banana' }, { name: 'Apple' }, { name: 'cherry' }];

      expect(sortSpacesByName(input)).toEqual([
        { name: 'Apple' },
        { name: 'banana' },
        { name: 'cherry' },
      ]);
    });
  });

  describe('with accented names', () => {
    it('orders them using locale-aware comparison', () => {
      const input = [{ name: 'Zebra' }, { name: 'Éclair' }, { name: 'Apple' }];

      expect(sortSpacesByName(input).map((s) => s.name)).toEqual([
        'Apple',
        'Éclair',
        'Zebra',
      ]);
    });
  });

  describe('with an input array', () => {
    it('does not mutate the input', () => {
      const input = [{ name: 'Zebra' }, { name: 'Apple' }];
      const snapshot = [...input];

      sortSpacesByName(input);

      expect(input).toEqual(snapshot);
    });
  });

  describe('with items that carry extra properties', () => {
    it('preserves the extra properties on sorted items', () => {
      const input = [
        { name: 'Beta', id: '2' as const },
        { name: 'Alpha', id: '1' as const },
      ];

      expect(sortSpacesByName(input)).toEqual([
        { name: 'Alpha', id: '1' },
        { name: 'Beta', id: '2' },
      ]);
    });
  });
});
