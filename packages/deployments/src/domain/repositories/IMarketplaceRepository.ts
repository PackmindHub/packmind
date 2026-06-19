import {
  GitRepoId,
  IRepository,
  Marketplace,
  MarketplaceDescriptor,
  MarketplaceErrorKind,
  MarketplaceId,
  MarketplaceState,
  OrganizationId,
} from '@packmind/types';

/**
 * Patch payload accepted by `updateState` — used by the reconciliation job to
 * refresh a marketplace's health state and (on drift) its descriptor cache.
 */
export type MarketplaceStateUpdate = {
  state: MarketplaceState;
  lastValidatedAt: Date;
  descriptor?: MarketplaceDescriptor;
  pluginCount?: number;
  // Each field is set only when present; pass `null` explicitly to clear.
  errorKind?: MarketplaceErrorKind | null;
  errorDetail?: string | null;
  pendingPrUrl?: string | null;
  outdatedPluginSlugs?: string[] | null;
};

/**
 * Persistence contract for the `Marketplace` entity.
 *
 * Soft-delete-aware: default finders exclude soft-deleted rows. Concrete
 * implementations extend `AbstractRepository<Marketplace>` so they inherit
 * the standard CRUD methods (`add`, `findById`, `deleteById`, etc.) from
 * `IRepository<Marketplace>`.
 */
export interface IMarketplaceRepository extends IRepository<Marketplace> {
  /**
   * List every (non-soft-deleted) marketplace linked to an organization.
   * Used by `ListMarketplacesUseCase`.
   */
  findByOrganizationId(organizationId: OrganizationId): Promise<Marketplace[]>;

  /**
   * Find the active marketplace bound to a specific git repo for an
   * organization. Used by the link duplicate-check.
   */
  findByOrganizationAndGitRepo(
    organizationId: OrganizationId,
    gitRepoId: GitRepoId,
  ): Promise<Marketplace | null>;

  /**
   * Lookup a marketplace by id, scoped to an organization. Used by
   * `UnlinkMarketplaceUseCase` to enforce org boundaries.
   */
  findByOrganizationAndId(
    organizationId: OrganizationId,
    id: MarketplaceId,
  ): Promise<Marketplace | null>;

  /**
   * Return every non-soft-deleted marketplace, regardless of organization.
   * Used by the BullMQ-driven reconciliation sweep.
   */
  findAllForReconciliation(): Promise<Marketplace[]>;

  /**
   * Apply a partial state update — at least `state` + `lastValidatedAt`,
   * optionally `descriptor` + `pluginCount` on drift. Bumps `updated_at`.
   */
  updateState(id: MarketplaceId, patch: MarketplaceStateUpdate): Promise<void>;

  /**
   * Find a marketplace by its tracking token.
   *
   * Used by the public heartbeat endpoint to resolve the marketplace (and
   * therefore its org) without any user credentials.
   * Returns `null` when no active (non-soft-deleted) marketplace has that token.
   */
  findByTrackingToken(token: string): Promise<Marketplace | null>;
}
