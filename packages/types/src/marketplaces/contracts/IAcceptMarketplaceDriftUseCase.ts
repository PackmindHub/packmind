import { IUseCase, PackmindCommand } from '../../UseCase';
import { MarketplaceErrorKind } from '../MarketplaceErrorKind';
import { MarketplaceId } from '../MarketplaceId';
import { MarketplaceState } from '../MarketplaceState';

export type AcceptMarketplaceDriftCommand = PackmindCommand & {
  marketplaceId: MarketplaceId;
};

export type AcceptMarketplaceDriftResponse = {
  state: MarketplaceState;
  lastValidatedAt: Date;
  errorKind: MarketplaceErrorKind | null;
  errorDetail: string | null;
  pendingPrUrl: string | null;
  outdatedPluginSlugs: string[] | null;
  /**
   * Plugin slugs whose `success` distributions were just transitioned to
   * `removed` as part of accepting the drift. Empty when the drift resolved
   * itself or when the reconciliation surfaced an unreachable/bad_format
   * state.
   */
  acceptedRemovedSlugs: string[];
};

/**
 * Always re-fetches the descriptor first (no freshness debounce) so the accept
 * never persists a stale snapshot. When the re-fetch lands on `unreachable` or
 * `bad_format`, that state is returned without mutating anything, so the caller
 * can surface the right error message; a drift that resolved itself is a no-op.
 *
 * Member-scoped, mirroring the on-demand "Sync now" access model: any org
 * member who can see the marketplace can accept its drift.
 */
export type IAcceptMarketplaceDriftUseCase = IUseCase<
  AcceptMarketplaceDriftCommand,
  AcceptMarketplaceDriftResponse
>;
