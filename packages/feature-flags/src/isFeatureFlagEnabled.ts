/**
 * Pure, browser-safe inputs of a feature-flag evaluation.
 *
 * These are the non-React fields extracted from the frontend
 * `IPMFeatureFlagProps` so both the frontend and the backend can share the
 * exact same decision function.
 */
export interface FeatureFlagEvaluationInput {
  featureKeys: readonly string[];
  featureDomainMap: Record<string, readonly string[]>;
  userEmail?: string | null;
}

/**
 * The entry that opens a flag to everybody rather than to a list. It still
 * needs somebody signed in: `isFeatureFlagEnabled` answers false for an absent
 * email before any entry is read, so `*` means every account, not every
 * visitor.
 *
 * A flag opened this way keeps its entry in the registry, which is what lets it
 * be narrowed again by editing one line rather than by reverting the code that
 * reads it.
 */
export const EVERY_ACCOUNT_ENTRY = '*';

const isEveryAccountEntry = (entry: string): boolean =>
  entry.trim() === EVERY_ACCOUNT_ENTRY;

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
  if (isEveryAccountEntry(entry)) {
    return true;
  }
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
}: FeatureFlagEvaluationInput): boolean => {
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
