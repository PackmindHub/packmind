import { IUseCase, PackmindCommand } from '../../UseCase';
import { MarketplaceErrorKind } from '../MarketplaceErrorKind';
import { MarketplaceId } from '../MarketplaceId';
import { MarketplaceState } from '../MarketplaceState';

/**
 * The same sweep the repeatable cron runs, but kicked synchronously from the
 * marketplace details view so a user need not wait for the next scheduled one.
 *
 * Member-scoped: any org member who can see the marketplace can refresh it.
 * Safe to expose that widely because the reconciliation only syncs Packmind's
 * view to the repo's reality — drift detection and `to_be_removed → removed`
 * transitions — and never lets the caller choose an outcome.
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
