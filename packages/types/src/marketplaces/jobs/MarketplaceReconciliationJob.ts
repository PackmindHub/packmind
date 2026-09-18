import { MarketplaceErrorKind } from '../MarketplaceErrorKind';
import { MarketplaceId } from '../MarketplaceId';
import { MarketplaceState } from '../MarketplaceState';

/**
 * One job per marketplace, not one sweep for all of them: the worker resolves
 * this single id, re-fetches its descriptor and persists the resulting state.
 */
export interface MarketplaceReconciliationJobInput {
  marketplaceId: MarketplaceId;
}

/** Mirrors the state persisted on the `Marketplace` row at the end of the run. */
export interface MarketplaceReconciliationJobOutput {
  state: MarketplaceState;
  lastValidatedAt: Date;
  errorKind: MarketplaceErrorKind | null;
  errorDetail: string | null;
  pendingPrUrl: string | null;
  outdatedPluginSlugs: string[] | null;
}
