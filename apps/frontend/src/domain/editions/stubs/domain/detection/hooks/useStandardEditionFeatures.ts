import type { Standard } from '@packmind/types';

export type StandardEditionFeatures = {
  ruleLanguages: Record<string, string[]>;
};

export const useStandardEditionFeatures = (
  _standardId: Standard['id'],
): StandardEditionFeatures => ({
  ruleLanguages: {},
});
