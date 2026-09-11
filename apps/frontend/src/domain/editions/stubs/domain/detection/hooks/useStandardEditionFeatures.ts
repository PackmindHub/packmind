import type { RuleDetectionStatusSummary, Standard } from '@packmind/types';
import { useQuery } from '@tanstack/react-query';

export type StandardEditionFeatures = {
  ruleLanguages: Record<string, string[]>;
};

export const useStandardEditionFeatures = (
  _standardId: Standard['id'],
): StandardEditionFeatures => ({
  ruleLanguages: {},
});

/**
 * No linter in this edition, so a rule is neither checked nor waiting to be:
 * the question does not apply, and a screen that answered it would name a
 * feature that is not here.
 */
export function hasRuleDetection(): boolean {
  return false;
}

export const useGetStandardRulesDetectionStatusQuery = (standardId: string) => {
  const data: RuleDetectionStatusSummary[] = [];
  return { data, isLoading: false, isError: false };
};
