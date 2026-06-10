import {
  DistributionStatus,
  IRepository,
  MarketplaceDistribution,
  MarketplaceDistributionId,
  MarketplaceId,
  PackageId,
  PublishFailureReason,
  VersionFingerprint,
} from '@packmind/types';

/**
 * Patch payload accepted by `updateStatus` — used by the
 * `PublishPluginToMarketplaceDelayedJob` to transition a marketplace
 * distribution from `in_progress` to its terminal state and capture the
 * resulting Git artifacts.
 *
 * All side-channel fields are optional so the worker can record only
 * what's relevant (e.g. `failureReason` + `error` on failure;
 * `contentHash` + `prUrl` + `gitCommit` on success/no-op).
 */
export type MarketplaceDistributionStatusUpdate = {
  status: DistributionStatus;
  prUrl?: string;
  gitCommit?: string;
  error?: string;
  failureReason?: PublishFailureReason;
  contentHash?: string;
  versionFingerprint?: VersionFingerprint;
  /** Stamped by reconciliation on the `pending_merge → success` promotion. */
  publishConfirmedAt?: Date;
};

/**
 * Persistence contract for the `MarketplaceDistribution` entity.
 *
 * Soft-delete-aware: concrete implementations extend
 * `AbstractRepository<MarketplaceDistribution>` so they inherit the
 * standard CRUD methods (`add`, `findById`, `deleteById`, etc.) from
 * `IRepository<MarketplaceDistribution>`.
 */
export interface IMarketplaceDistributionRepository extends IRepository<MarketplaceDistribution> {
  /**
   * Lookup every (non-soft-deleted) distribution targeting a given
   * marketplace, most recent first. Used by audit views and the
   * reconciliation/idempotency probes.
   */
  findByMarketplaceId(
    marketplaceId: MarketplaceId,
  ): Promise<MarketplaceDistribution[]>;

  /**
   * Lookup every (non-soft-deleted) distribution for a given package
   * across all marketplaces, most recent first. Used by the package
   * detail view.
   */
  findByPackageId(packageId: PackageId): Promise<MarketplaceDistribution[]>;

  /**
   * Return the most recent (non-soft-deleted) distribution for a given
   * (package, marketplace) pair — or `null` when none exists.
   *
   * Used by the publish use case to compute `isFirstPublishForPackage`
   * and by the BullMQ job to short-circuit no-ops against the previous
   * `success` row's `contentHash`.
   */
  findLatestByPackageAndMarketplace(
    packageId: PackageId,
    marketplaceId: MarketplaceId,
  ): Promise<MarketplaceDistribution | null>;

  /**
   * Return the most recent (non-soft-deleted) `success`-state distribution
   * for a given `(package, marketplace)` pair — or `null` when none exists.
   *
   * Used by `MarkPluginForRemovalUseCase` when the caller targets a package
   * by id (rather than passing the distribution id directly) and by the
   * package-delete cascade listener to locate the latest live distribution
   * to flip to `to_be_removed`.
   */
  findLatestSuccessfulByPackageAndMarketplace(
    packageId: PackageId,
    marketplaceId: MarketplaceId,
  ): Promise<MarketplaceDistribution | null>;

  /**
   * Return every (non-soft-deleted) `success` or `pending_merge` distribution
   * for a given package across all marketplaces. Used by the package-delete
   * cascade listener to flip every active distribution to `to_be_removed` —
   * a pending publish must be cascaded too, or deleting its package would
   * strand the plugin on the rolling sync branch and its open PR.
   */
  findActiveByPackageId(
    packageId: PackageId,
  ): Promise<MarketplaceDistribution[]>;

  /**
   * Return every (non-soft-deleted) `pending_merge`-state distribution for a
   * given marketplace. Used by the reconciliation job to drive the
   * `pending_merge → success` promotion once the rolling sync PR merges
   * (matched via the default-branch `packmind-lock.json` content hash).
   */
  findPendingMergesByMarketplaceId(
    marketplaceId: MarketplaceId,
  ): Promise<MarketplaceDistribution[]>;

  /**
   * Return every (non-soft-deleted) `to_be_removed`-state distribution for a
   * given marketplace. Used by the reconciliation job to drive the
   * `to_be_removed → removed` terminal transition and to suppress drift
   * detection for pending removals (AC10).
   */
  findPendingRemovalsByMarketplaceId(
    marketplaceId: MarketplaceId,
  ): Promise<MarketplaceDistribution[]>;

  /**
   * Return every (non-soft-deleted) `success`-state distribution for a given
   * marketplace. Used by the reconciliation job to detect drift — a success
   * slug that vanished from the descriptor.
   */
  findSuccessfulByMarketplaceId(
    marketplaceId: MarketplaceId,
  ): Promise<MarketplaceDistribution[]>;

  /**
   * Apply a partial state update — typically called by the BullMQ job
   * to transition `in_progress` to `success` / `failure` / `no_changes`
   * and record `prUrl`, `gitCommit`, `error`, `failureReason`, and
   * `contentHash` as applicable. Bumps `updated_at`.
   */
  updateStatus(
    id: MarketplaceDistributionId,
    patch: MarketplaceDistributionStatusUpdate,
  ): Promise<void>;

  /**
   * Set or clear the `removalRequestedAt` marker independently of `status`.
   *
   * `MarkPluginForRemovalUseCase` sets it to "now" the moment a removal is
   * requested (the `status` stays `success` until the sync commit lands), and
   * `CancelPluginRemovalUseCase` clears it (passes `null`). Bumps `updated_at`.
   */
  updateRemovalRequestedAt(
    id: MarketplaceDistributionId,
    removalRequestedAt: Date | null,
  ): Promise<void>;
}
