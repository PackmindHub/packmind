import {
  MarketplaceId,
  PluginInstallation,
  PluginInstallationId,
} from '@packmind/types';

/**
 * Input shape for upserting a heartbeat row.
 *
 * The repository computes `identityKey` and `repoKey` from the provided fields,
 * so callers do not need to pre-compute them.
 */
export type UpsertHeartbeatInput = {
  id: PluginInstallationId;
  organizationId: string;
  marketplaceId: MarketplaceId;
  pluginSlug: string;
  packageId: string | null;
  /** Version reported as installed; `null` when the client did not resolve one. */
  installedVersion: string | null;
  scope: PluginInstallation['scope'];
  userId: string | null;
  anonymousIdHash: string | null;
  anonymousEmailMasked: string | null;
  repoRemoteUrl: string | null;
  now: Date;
};

/**
 * Result returned by `upsertHeartbeat`.
 *
 * `created = true` when a new row was inserted (first-seen signal).
 * `created = false` when an existing row's `updatedAt` (last-seen) was bumped.
 * The returned `installation` is the current state after the upsert.
 */
export type UpsertHeartbeatResult = {
  created: boolean;
  installation: PluginInstallation;
};

/**
 * Persistence contract for the `PluginInstallation` entity.
 *
 * Designed around the heartbeat semantics described in spec §7.1:
 * - Upsert collapses repeated heartbeats per unique key
 * - Anonymous→attributed upgrade preserves `createdAt` (first-seen)
 * - `listByMarketplace` returns all rows for the org member drill-down
 */
export interface IPluginInstallationRepository {
  /**
   * Insert or update a heartbeat row.
   *
   * ### Absent-field key rule
   * `identityKey` = `userId ?? anonymousIdHash ?? ''`
   * `repoKey`     = `''` when `scope === 'user'`, else the normalized `owner/repo`
   *                 slug of `repoRemoteUrl` ?? the raw `repoRemoteUrl` ?? `''`
   *
   * ### Anonymous → attributed upgrade (§7.1)
   * When `userId` is provided and an anonymous row exists with
   * `identityKey = anonymousIdHash` for the same (marketplace, slug, scope, repoKey),
   * that row is upgraded to use the `userId` as `identityKey`.
   *
   * ### Merge edge cases (§7.1)
   * 1. If an **attributed row already exists** for the `userId` key AND an anonymous
   *    row exists too (credentials-expired scenario), the two rows are merged: the
   *    attributed row keeps the earliest `createdAt`; the anonymous row is deleted.
   * 2. An **anonymous heartbeat** whose `anonymousIdHash` matches an attributed
   *    row's stored `anonymousIdHash` bumps that attributed row's `updatedAt`
   *    rather than inserting a duplicate.
   *
   * Returns `created = true` only on actual INSERT (not on update/upgrade/merge).
   */
  upsertHeartbeat(input: UpsertHeartbeatInput): Promise<UpsertHeartbeatResult>;

  /**
   * Return all non-soft-deleted installation rows for a marketplace.
   * Used by `ListMarketplacePluginInstallsUseCase` to serve the org-member
   * drill-down endpoint.
   */
  listByMarketplace(
    marketplaceId: MarketplaceId,
  ): Promise<PluginInstallation[]>;
}
