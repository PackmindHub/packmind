import {
  levenshteinSimilarity,
  jaccardSimilarity,
  combinedSimilarity,
  matchUpdatedRules,
} from './ruleSimilarity';

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

describe('jaccardSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(jaccardSimilarity('hello world', 'hello world')).toBe(1);
  });

  it('returns 0 for completely different words', () => {
    expect(jaccardSimilarity('hello world', 'foo bar')).toBe(0);
  });

  describe('when both strings are empty', () => {
    it('returns 0', () => {
      expect(jaccardSimilarity('', '')).toBe(0);
    });
  });

  it('returns 1 for reordered identical words', () => {
    expect(jaccardSimilarity('hello world foo', 'foo hello world')).toBe(1);
  });

  describe('when sentences are restructured', () => {
    const a =
      'Keep gateway methods concise by delegating authentication and error handling to PackmindHttpClient';
    const b =
      'Delegate authentication and error handling to PackmindHttpClient to keep gateway methods focused and concise';

    it('rescues restructured sentences that Levenshtein misses', () => {
      expect(jaccardSimilarity(a, b)).toBeGreaterThanOrEqual(0.5);
    });
  });
});

describe('combinedSimilarity', () => {
  describe('when sentences are restructured', () => {
    const a =
      'Keep gateway methods concise by delegating authentication and error handling to PackmindHttpClient';
    const b =
      'Delegate authentication and error handling to PackmindHttpClient to keep gateway methods focused and concise';

    it('takes the max of levenshtein and jaccard', () => {
      expect(combinedSimilarity(a, b)).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('when levenshtein scores higher', () => {
    const a =
      'Keep gateway methods concise by delegating authentication and error handling to PackmindHttpClient';
    const b =
      'Keep gateway methods simple by delegating auth and error handling to PackmindHttpClient';

    it('returns levenshtein score', () => {
      expect(combinedSimilarity(a, b)).toBeGreaterThan(0.8);
    });
  });

  describe('when rules are genuinely different', () => {
    const a = 'Always use snake_case for variable names in Python code';
    const b =
      'Deploy microservices independently using separate CI/CD pipelines';

    it('returns low score', () => {
      expect(combinedSimilarity(a, b)).toBeLessThan(0.3);
    });
  });
});

describe('matchUpdatedRules', () => {
  it('returns empty results for empty inputs', () => {
    expect(matchUpdatedRules([], [])).toEqual({
      updates: [],
      remainingDeleted: [],
      remainingAdded: [],
    });
  });

  describe('when a rule is slightly modified', () => {
    const deleted = [
      'Keep gateway methods concise by delegating authentication and error handling to PackmindHttpClient',
    ];
    const added = [
      'Keep gateway methods simple by delegating auth and error handling to PackmindHttpClient',
    ];

    it('matches the modified rule as an update', () => {
      expect(matchUpdatedRules(deleted, added).updates).toEqual([
        { oldValue: deleted[0], newValue: added[0] },
      ]);
    });

    it('leaves no remaining deleted rules', () => {
      expect(matchUpdatedRules(deleted, added).remainingDeleted).toEqual([]);
    });

    it('leaves no remaining added rules', () => {
      expect(matchUpdatedRules(deleted, added).remainingAdded).toEqual([]);
    });
  });

  describe('when rules are genuinely different', () => {
    const deleted = ['Always use snake_case for variable names in Python code'];
    const added = [
      'Deploy microservices independently using separate CI/CD pipelines',
    ];

    it('does not match them as an update', () => {
      expect(matchUpdatedRules(deleted, added).updates).toEqual([]);
    });

    it('keeps the deleted rule as remaining', () => {
      expect(matchUpdatedRules(deleted, added).remainingDeleted).toEqual(
        deleted,
      );
    });

    it('keeps the added rule as remaining', () => {
      expect(matchUpdatedRules(deleted, added).remainingAdded).toEqual(added);
    });
  });

  describe('when multiple candidates exist', () => {
    const deleted = [
      'Keep gateway methods concise by delegating authentication and error handling to PackmindHttpClient',
    ];
    const added = [
      'Deploy microservices independently using separate CI/CD pipelines',
      'Keep gateway methods simple by delegating auth and error handling to PackmindHttpClient',
    ];

    it('picks the best match', () => {
      expect(matchUpdatedRules(deleted, added).updates).toEqual([
        { oldValue: deleted[0], newValue: added[1] },
      ]);
    });

    it('keeps unmatched added rules as remaining', () => {
      expect(matchUpdatedRules(deleted, added).remainingAdded).toEqual([
        added[0],
      ]);
    });
  });

  describe('when handling multiple updates with greedy pairing', () => {
    const deleted = [
      'Keep gateway methods concise by delegating authentication and error handling to PackmindHttpClient',
      'Always use snake_case for variable names in Python code',
    ];
    const added = [
      'Always prefer snake_case for variable naming in Python projects',
      'Keep gateway methods simple by delegating auth and error handling to PackmindHttpClient',
    ];

    it('matches both pairs correctly', () => {
      const result = matchUpdatedRules(deleted, added);
      expect(result.updates).toHaveLength(2);
    });

    it('leaves no remaining deleted rules', () => {
      expect(matchUpdatedRules(deleted, added).remainingDeleted).toEqual([]);
    });

    it('leaves no remaining added rules', () => {
      expect(matchUpdatedRules(deleted, added).remainingAdded).toEqual([]);
    });
  });

  describe('when using custom threshold', () => {
    const deleted = [
      'Keep gateway methods concise by delegating authentication and error handling to PackmindHttpClient',
    ];
    const added = [
      'Keep gateway methods simple by delegating auth and error handling to PackmindHttpClient',
    ];

    describe('when threshold is at default 0.5', () => {
      it('matches the pair', () => {
        expect(matchUpdatedRules(deleted, added, 0.5).updates).toHaveLength(1);
      });
    });

    describe('when threshold is very high at 0.9', () => {
      it('does not match the pair', () => {
        expect(matchUpdatedRules(deleted, added, 0.9).updates).toHaveLength(0);
      });
    });
  });
});
