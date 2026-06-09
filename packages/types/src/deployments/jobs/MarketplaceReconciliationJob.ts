import { MarketplaceErrorKind } from '../MarketplaceErrorKind';
import { MarketplaceId } from '../MarketplaceId';
import { MarketplaceState } from '../MarketplaceState';

/**
 * Input payload for the marketplace reconciliation BullMQ job.
 *
 * The job is per-marketplace — the worker uses `marketplaceId` to load the
 * marketplace row, fetch its `marketplace.json` via the git port, parse it,
 * and persist the resulting state (`healthy | drift | unreachable`).
 */
export interface MarketplaceReconciliationJobInput {
  marketplaceId: MarketplaceId;
}

/**
 * Output payload returned by the reconciliation worker. Reflects the state
 * persisted on the `Marketplace` row at the end of the run.
 */
export interface MarketplaceReconciliationJobOutput {
  state: MarketplaceState;
  lastValidatedAt: Date;
  errorKind: MarketplaceErrorKind | null;
  errorDetail: string | null;
  pendingPrUrl: string | null;
  outdatedPluginSlugs: string[] | null;
}
