import { IUseCase, PackmindCommand } from '../../UseCase';
import { MarketplaceErrorKind } from '../MarketplaceErrorKind';
import { MarketplaceId } from '../MarketplaceId';
import { MarketplaceState } from '../MarketplaceState';

/**
 * Triggers an immediate, on-demand reconciliation of a single marketplace —
 * the same sweep the repeatable cron runs, but kicked synchronously by an org
 * member from the marketplace details view. Lets users refresh marketplace
 * state without waiting for the next scheduled reconciliation (the stop-gap
 * for the up-to-30-min lag until Git webhooks land).
 *
 * Member-scoped: any org member who can see the marketplace can refresh it.
 * The reconciliation only syncs Packmind's view to the repo's reality
 * (drift detection + `to_be_removed → removed` transitions); it never lets the
 * caller choose an outcome.
 */
export type SyncMarketplaceNowCommand = PackmindCommand & {
  marketplaceId: MarketplaceId;
};

export type SyncMarketplaceNowResponse = {
  state: MarketplaceState;
  lastValidatedAt: Date;
  errorKind: MarketplaceErrorKind | null;
  errorDetail: string | null;
  pendingPrUrl: string | null;
  outdatedPluginSlugs: string[] | null;
};

export type ISyncMarketplaceNowUseCase = IUseCase<
  SyncMarketplaceNowCommand,
  SyncMarketplaceNowResponse
>;
