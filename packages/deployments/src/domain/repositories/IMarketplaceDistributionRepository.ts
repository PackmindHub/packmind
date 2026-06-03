import {
  DistributionStatus,
  IRepository,
  MarketplaceDistribution,
  MarketplaceDistributionId,
  MarketplaceId,
  PackageId,
  PublishFailureReason,
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
   * Apply a partial state update — typically called by the BullMQ job
   * to transition `in_progress` to `success` / `failure` / `no_changes`
   * and record `prUrl`, `gitCommit`, `error`, `failureReason`, and
   * `contentHash` as applicable. Bumps `updated_at`.
   */
  updateStatus(
    id: MarketplaceDistributionId,
    patch: MarketplaceDistributionStatusUpdate,
  ): Promise<void>;
}
