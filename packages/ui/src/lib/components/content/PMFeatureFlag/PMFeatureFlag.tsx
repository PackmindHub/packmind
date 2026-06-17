import { ReactNode } from 'react';

export interface IPMFeatureFlagProps {
  featureKeys: readonly string[];
  featureDomainMap: Record<string, readonly string[]>;
  userEmail?: string | null;
  children: ReactNode;
}

/* Custom feature toggle for the "Propose change" links in the app */
export const ADD_CHANGE_PROPOSALS_IN_WEBAPP_FEATURE_KEY =
  'change-proposals-in-webapp';

export const ORGA_SPACE_MANAGEMENT_FEATURE_KEY = 'orga-space-management';

export const GOVERNANCE_FEATURE_KEY = 'governance';

export const MARKETPLACES_FEATURE_KEY = 'marketplaces';

export const MARKETPLACE_PLUGIN_REMOVAL_FEATURE_KEY =
  'marketplace-plugin-removal';

export const DEFAULT_FEATURE_DOMAIN_MAP: Record<string, readonly string[]> = {
  [ADD_CHANGE_PROPOSALS_IN_WEBAPP_FEATURE_KEY]: [
    '@packmind.com',
    '@promyze.com',
  ],
  [ORGA_SPACE_MANAGEMENT_FEATURE_KEY]: ['@packmind.com', '@promyze.com'],
  [GOVERNANCE_FEATURE_KEY]: ['joan.racenet@packmind.com'],
  [MARKETPLACES_FEATURE_KEY]: ['@packmind.com', '@promyze.com'],
  [MARKETPLACE_PLUGIN_REMOVAL_FEATURE_KEY]: ['@packmind.com', '@promyze.com'],
};

const isExactEmailEntry = (entry: string): boolean =>
  entry.includes('@') && !entry.trim().startsWith('@');

const normalizeDomain = (domain: string): string =>
  domain.trim().toLowerCase().replace(/^@/, '');

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const extractDomainFromEmail = (email?: string | null): string | null => {
  if (!email) {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);
  const atIndex = normalizedEmail.lastIndexOf('@');

  if (atIndex === -1 || atIndex === normalizedEmail.length - 1) {
    return null;
  }

  return normalizedEmail.slice(atIndex + 1);
};

const isEntryAllowedForUser = ({
  entry,
  userEmail,
  userDomain,
}: {
  entry: string;
  userEmail: string;
  userDomain: string | null;
}): boolean => {
  if (isExactEmailEntry(entry)) {
    return normalizeEmail(entry) === userEmail;
  }
  return userDomain !== null && normalizeDomain(entry) === userDomain;
};

const isFeatureAllowedForUser = ({
  featureKey,
  userEmail,
  userDomain,
  featureDomainMap,
}: {
  featureKey: string;
  userEmail: string;
  userDomain: string | null;
  featureDomainMap: Record<string, readonly string[]>;
}): boolean => {
  const allowedEntries = featureDomainMap[featureKey];

  if (!allowedEntries?.length) {
    return false;
  }

  return allowedEntries.some((entry) =>
    isEntryAllowedForUser({ entry, userEmail, userDomain }),
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

  if (!userEmail) {
    return false;
  }

  const normalizedEmail = normalizeEmail(userEmail);
  const userDomain = extractDomainFromEmail(userEmail);

  return featureKeys.some((featureKey) =>
    isFeatureAllowedForUser({
      featureKey,
      userEmail: normalizedEmail,
      userDomain,
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
