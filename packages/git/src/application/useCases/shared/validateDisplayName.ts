import {
  GitProvider,
  GitProviderDisplayNameAlreadyUsedError,
  GitProviderId,
  OrganizationId,
} from '@packmind/types';

const GIT_PROVIDER_DISPLAY_NAME_MAX_LENGTH = 64;

/**
 * Trims and caps at the persisted column length. The empty string means "no
 * display name set" and, unlike a real name, may repeat within an organization.
 */
export function normalizeDisplayName(input: string | null | undefined): string {
  if (input === null || input === undefined) {
    return '';
  }
  return input.trim().slice(0, GIT_PROVIDER_DISPLAY_NAME_MAX_LENGTH);
}

/**
 * Uniqueness is case-insensitive and scoped to the organization. Empty values
 * bypass the check, so unnamed providers can coexist.
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
