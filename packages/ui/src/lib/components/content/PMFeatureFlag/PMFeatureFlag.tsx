import { ReactNode } from 'react';

export interface IPMFeatureFlagProps {
  featureKeys: readonly string[];
  featureDomainMap: Record<string, readonly string[]>;
  userEmail?: string | null;
  children: ReactNode;
}

export const RULE_DETAILS_DETECTION_TAB_FEATURE_KEY =
  'rule-details-detection-tab';

/* Custom feature toggle for the "Propose change" links in the app */
export const ADD_CHANGE_PROPOSALS_IN_WEBAPP_FEATURE_KEY =
  'change-proposals-in-webapp';

export const SPACE_IDENTITY_FEATURE_KEY = 'space-identity';

export const ORGA_SPACE_MANAGEMENT_FEATURE_KEY = 'orga-space-management';

export const DEFAULT_FEATURE_DOMAIN_MAP: Record<string, readonly string[]> = {
  [RULE_DETAILS_DETECTION_TAB_FEATURE_KEY]: ['@packmind.com', '@promyze.com'],
  [ADD_CHANGE_PROPOSALS_IN_WEBAPP_FEATURE_KEY]: [
    '@packmind.com',
    '@promyze.com',
  ],
  [SPACE_IDENTITY_FEATURE_KEY]: ['@packmind.com', '@promyze.com'],
  [ORGA_SPACE_MANAGEMENT_FEATURE_KEY]: ['@packmind.com', '@promyze.com'],
};

const isEmailEntry = (entry: string): boolean => {
  const trimmed = entry.trim();
  return trimmed.includes('@') && !trimmed.startsWith('@');
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

const isAllowedForFeature = ({
  featureKey,
  userEmail,
  featureDomainMap,
}: {
  featureKey: string;
  userEmail: string;
  featureDomainMap: Record<string, readonly string[]>;
}): boolean => {
  const allowedEntries = featureDomainMap[featureKey];

  if (!allowedEntries?.length) {
    return false;
  }

  const normalizedEmail = userEmail.trim().toLowerCase();
  const userDomain = extractDomainFromEmail(normalizedEmail);

  return allowedEntries.some((entry) => {
    if (isEmailEntry(entry)) {
      return entry.trim().toLowerCase() === normalizedEmail;
    }
    return userDomain ? normalizeDomain(entry) === userDomain : false;
  });
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

  if (!userEmail) {
    return false;
  }

  return featureKeys.some((featureKey) =>
    isAllowedForFeature({
      featureKey,
      userEmail,
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
