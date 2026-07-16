import { ReactNode } from 'react';
import {
  FeatureFlagEvaluationInput,
  isFeatureFlagEnabled,
} from '@packmind/feature-flags';

/*
 * Back-compat re-exports: the pure registry + evaluation now live in
 * `@packmind/feature-flags`. Re-export them here so existing `@packmind/ui`
 * consumers keep importing the keys, the default domain map and the pure
 * evaluation function unchanged.
 */
export {
  ADD_CHANGE_PROPOSALS_IN_WEBAPP_FEATURE_KEY,
  ORGA_SPACE_MANAGEMENT_FEATURE_KEY,
  GOVERNANCE_FEATURE_KEY,
  DEFAULT_FEATURE_DOMAIN_MAP,
  isFeatureFlagEnabled,
} from '@packmind/feature-flags';
export type {
  FeatureFlagKey,
  FeatureFlagEvaluationInput,
} from '@packmind/feature-flags';

export type IPMFeatureFlagProps = FeatureFlagEvaluationInput & {
  children: ReactNode;
};

export const PMFeatureFlag = ({
  featureKeys,
  featureDomainMap,
  userEmail,
  children,
}: IPMFeatureFlagProps) => {
  const isEnabled = isFeatureFlagEnabled({
    featureKeys,
    featureDomainMap,
    userEmail,
  });

  if (!isEnabled) {
    return null;
  }

  return <>{children}</>;
};
