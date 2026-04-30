import { ReactNode } from 'react';

export interface IPMFeatureFlagProps {
  featureKeys: readonly string[];
  featureDomainMap: Record<string, readonly string[]>;
  userEmail?: string | null;
  children: ReactNode;
}

export const RULE_DETAILS_DETECTION_TAB_FEATURE_KEY =
  'rule-details-detection-tab';

export const MCP_CONFIG_REDESIGN_FEATURE_KEY = 'mcp-config-redesign';

export const STANDARD_SAMPLES_FEATURE_KEY = 'standard-samples';

export const CHANGE_PROPOSALS_FEATURE_KEY = 'change-proposals';

/* Custom feature toggle for the "Propose change" links in the app */
export const ADD_CHANGE_PROPOSALS_IN_WEBAPP_FEATURE_KEY =
  'change-proposals-in-webapp';

export const DEFAULT_FEATURE_DOMAIN_MAP: Record<string, readonly string[]> = {
  [RULE_DETAILS_DETECTION_TAB_FEATURE_KEY]: ['@packmind.com', '@promyze.com'],
  [MCP_CONFIG_REDESIGN_FEATURE_KEY]: ['@packmind.com', '@promyze.com'],
  [STANDARD_SAMPLES_FEATURE_KEY]: ['@packmind.com', '@promyze.com'],
  [CHANGE_PROPOSALS_FEATURE_KEY]: ['@packmind.com', '@promyze.com'],
  [ADD_CHANGE_PROPOSALS_IN_WEBAPP_FEATURE_KEY]: [
    '@packmind.com',
    '@promyze.com',
  ],
};

const normalizeDomain = (domain: string): string =>
  domain.trim().toLowerCase().replace(/^@/, '');

const extractDomainFromEmail = (email?: string | null): string | null => {
  if (!email) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const atIndex = normalizedEmail.lastIndexOf('@');

  if (atIndex === -1 || atIndex === normalizedEmail.length - 1) {
    return null;
  }

  return normalizedEmail.slice(atIndex + 1);
};

const isDomainAllowedForFeature = ({
  featureKey,
  domain,
  featureDomainMap,
}: {
  featureKey: string;
  domain: string;
  featureDomainMap: Record<string, readonly string[]>;
}): boolean => {
  const allowedDomains = featureDomainMap[featureKey];

  if (!allowedDomains?.length) {
    return false;
  }

  return allowedDomains.some(
    (allowedDomain) => normalizeDomain(allowedDomain) === domain,
  );
};

export const isFeatureFlagEnabled = ({
  featureKeys,
  featureDomainMap,
  userEmail,
}: Pick<
  IPMFeatureFlagProps,
  'featureKeys' | 'featureDomainMap' | 'userEmail'
>) => {
  if (!featureKeys.length) {
    return true;
  }

  const userDomain = extractDomainFromEmail(userEmail);

  if (!userDomain) {
    return false;
  }

  return featureKeys.some((featureKey) =>
    isDomainAllowedForFeature({
      featureKey,
      domain: userDomain,
      featureDomainMap,
    }),
  );
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
