import {
  GitProvider,
  GitProviderDisplayNameAlreadyUsedError,
  GitProviderId,
  OrganizationId,
} from '@packmind/types';

export const GIT_PROVIDER_DISPLAY_NAME_MAX_LENGTH = 64;

/**
 * Normalize a display name input: trim leading/trailing whitespace and cap at
 * the persisted column length. An empty input resolves to an empty string,
 * which represents "no display name set" and is allowed to coexist with other
 * empty values within an organization.
 */
export function normalizeDisplayName(input: string | null | undefined): string {
  if (input === null || input === undefined) {
    return '';
  }
  return input.trim().slice(0, GIT_PROVIDER_DISPLAY_NAME_MAX_LENGTH);
}

/**
 * Verify case-insensitive uniqueness of a non-empty display name within an
 * organization. Empty values bypass the check (multiple unnamed providers
 * coexist). Throws GitProviderDisplayNameAlreadyUsedError on collision.
 */
export function ensureDisplayNameAvailable(
  normalized: string,
  organizationId: OrganizationId,
  existingProviders: ReadonlyArray<GitProvider>,
  ignoreProviderId?: GitProviderId,
): void {
  if (normalized.length === 0) {
    return;
  }

  const target = normalized.toLowerCase();
  const collision = existingProviders.some(
    (provider) =>
      provider.id !== ignoreProviderId &&
      provider.displayName.trim().toLowerCase() === target,
  );

  if (collision) {
    throw new GitProviderDisplayNameAlreadyUsedError(
      normalized,
      organizationId,
    );
  }
}
