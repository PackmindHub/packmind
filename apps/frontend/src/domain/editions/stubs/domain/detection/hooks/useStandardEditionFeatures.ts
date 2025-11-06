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

export const useGetStandardRulesDetectionStatusQuery = (standardId: string) => {
  const data: RuleDetectionStatusSummary[] = [];
  return { data };
};
