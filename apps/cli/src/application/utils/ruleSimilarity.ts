const DEFAULT_SIMILARITY_THRESHOLD = 0.5;

export type RuleUpdateMatch = {
  oldValue: string;
  newValue: string;
};

export type MatchResult = {
  updates: RuleUpdateMatch[];
  remainingDeleted: string[];
  remainingAdded: string[];
};

export function matchUpdatedRules(
  deletedRules: string[],
  addedRules: string[],
  threshold = DEFAULT_SIMILARITY_THRESHOLD,
): MatchResult {
  const updates: RuleUpdateMatch[] = [];
  const usedDeleted = new Set<number>();
  const usedAdded = new Set<number>();

  const pairs: { deletedIdx: number; addedIdx: number; score: number }[] = [];
  for (let d = 0; d < deletedRules.length; d++) {
    for (let a = 0; a < addedRules.length; a++) {
      const score = combinedSimilarity(deletedRules[d], addedRules[a]);
      if (score >= threshold) {
        pairs.push({ deletedIdx: d, addedIdx: a, score });
      }
    }
  }

  pairs.sort((a, b) => b.score - a.score);
  for (const pair of pairs) {
    if (usedDeleted.has(pair.deletedIdx) || usedAdded.has(pair.addedIdx))
      continue;
    usedDeleted.add(pair.deletedIdx);
    usedAdded.add(pair.addedIdx);
    updates.push({
      oldValue: deletedRules[pair.deletedIdx],
      newValue: addedRules[pair.addedIdx],
    });
  }

  const remainingDeleted = deletedRules.filter((_, i) => !usedDeleted.has(i));
  const remainingAdded = addedRules.filter((_, i) => !usedAdded.has(i));

  return { updates, remainingDeleted, remainingAdded };
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (setA.size === 0 && setB.size === 0) return 1;

  const intersection = new Set([...setA].filter((word) => setB.has(word)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

export function combinedSimilarity(a: string, b: string): number {
  return Math.max(levenshteinSimilarity(a, b), jaccardSimilarity(a, b));
}

export function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return 1 - matrix[a.length][b.length] / maxLen;
}
