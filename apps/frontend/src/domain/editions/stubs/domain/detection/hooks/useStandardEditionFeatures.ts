import type { Standard } from '@packmind/shared';

export type StandardEditionFeatures = {
  ruleLanguages: Record<string, string[]>;
};

export const useStandardEditionFeatures = (
  _standardId: Standard['id'],
): StandardEditionFeatures => ({
  ruleLanguages: {},
});
