import { handleScope } from './handleScope';

describe('handleScope', () => {
  describe('when scope is null', () => {
    it('returns an empty list', () => {
      expect(handleScope(null)).toEqual([]);
    });
  });

  describe('when scope is a string', () => {
    describe('returns an empty list if the string is blank', () => {
      expect(handleScope('   ')).toEqual([]);
    });

    it('splits the string with comma and trims the values', () => {
      expect(handleScope('a, b ,  c')).toEqual(['a', 'b', 'c']);
    });
  });

  describe('when scope is a list of string', () => {
    it('returns a list of string and may split sub-items', () => {
      expect(handleScope(['a', 'b, c'])).toEqual(['a', 'b', 'c']);
    });

    it('filters out blank sub-strings', () => {
      expect(handleScope(['a', 'b, c, '])).toEqual(['a', 'b', 'c']);
    });
  });
});
