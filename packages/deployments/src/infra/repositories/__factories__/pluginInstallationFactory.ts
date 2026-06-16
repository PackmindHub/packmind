import { Factory } from '@packmind/test-utils';
import {
  PluginInstallation,
  createMarketplaceId,
  createOrganizationId,
  createPluginInstallationId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Factory for building `PluginInstallation` rows in tests.
 *
 * Provides sensible defaults; callers override the fields they need.
 * `identityKey` and `repoKey` are NOT NULL per spec §7.1 — defaults
 * mirror the absent-field key rule:
 *   identityKey = userId ?? anonymousIdHash ?? ''
 *   repoKey     = '' for user scope; normalized slug ?? repoRemoteUrl ?? '' otherwise
 */
export const pluginInstallationFactory: Factory<PluginInstallation> = (
  overrides?: Partial<PluginInstallation>,
): PluginInstallation => {
  const userId = overrides?.userId ?? null;
  const anonymousIdHash = overrides?.anonymousIdHash ?? null;
  const scope = overrides?.scope ?? 'user';
  const repoRemoteUrl = overrides?.repoRemoteUrl ?? null;

  const identityKey =
    overrides?.identityKey !== undefined
      ? overrides.identityKey
      : (userId ?? anonymousIdHash ?? '');

  const repoKey =
    overrides?.repoKey !== undefined
      ? overrides.repoKey
      : scope === 'user'
        ? ''
        : (repoRemoteUrl ?? '');

  return {
    id: createPluginInstallationId(uuidv4()),
    organizationId: createOrganizationId(uuidv4()),
    marketplaceId: createMarketplaceId(uuidv4()),
    pluginSlug: 'test-plugin',
    packageId: null,
    installedVersion: null,
    scope,
    userId,
    anonymousIdHash,
    anonymousEmailMasked: null,
    repoRemoteUrl,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    deletedBy: null,
    ...overrides,
    // Recompute computed keys when overrides change the source fields
    identityKey,
    repoKey,
  };
};
