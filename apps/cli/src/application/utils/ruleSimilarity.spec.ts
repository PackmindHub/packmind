import { levenshteinSimilarity } from './ruleSimilarity';

describe('levenshteinSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(levenshteinSimilarity('hello', 'hello')).toBe(1);
  });

  it('returns 0 for completely different strings', () => {
    expect(levenshteinSimilarity('abc', 'xyz')).toBe(0);
  });

  describe('when both strings are empty', () => {
    it('returns 0', () => {
      expect(levenshteinSimilarity('', '')).toBe(0);
    });
  });

  describe('when one string is empty', () => {
    describe('when the second string is empty', () => {
      it('returns 0', () => {
        expect(levenshteinSimilarity('hello', '')).toBe(0);
      });
    });

    describe('when the first string is empty', () => {
      it('returns 0', () => {
        expect(levenshteinSimilarity('', 'hello')).toBe(0);
      });
    });
  });

  describe('when strings have a small edit distance', () => {
    const a =
      'Keep gateway methods concise by delegating authentication and error handling to PackmindHttpClient';
    const b =
      'Keep gateway methods simple by delegating auth and error handling to PackmindHttpClient';

    it('returns high similarity', () => {
      expect(levenshteinSimilarity(a, b)).toBeCloseTo(0.8367, 4);
    });
  });

  describe('when sentences are restructured', () => {
    const a =
      'Keep gateway methods concise by delegating authentication and error handling to PackmindHttpClient';
    const b =
      'Delegate authentication and error handling to PackmindHttpClient to keep gateway methods focused and concise';

    it('returns low similarity', () => {
      expect(levenshteinSimilarity(a, b)).toBeCloseTo(0.2593, 4);
    });
  });
});
