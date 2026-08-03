import { IUseCase, PackmindCommand } from '../../UseCase';
import { MarketplaceErrorKind } from '../MarketplaceErrorKind';
import { MarketplaceId } from '../MarketplaceId';
import { MarketplaceState } from '../MarketplaceState';

/**
 * Applies the current repository descriptor as the new Packmind-side baseline,
 * resolving an active drift on a marketplace. Always re-fetches the descriptor
 * first (no freshness debounce) so the accept never persists a stale snapshot,
 * then:
 *   - transitions every `success` distribution whose slug vanished from the
 *     descriptor to `removed` (terminal),
 *   - strips the `driftedPluginSlugs` annotation from the stored descriptor,
 *   - flips the marketplace state to `healthy`.
 *
 * No-op when the reconciliation shows the drift has self-resolved
 * (`state === 'healthy'`). When the reconciliation lands on `unreachable` or
 * `bad_format`, returns that state without mutating anything so the caller can
 * surface the right error message.
 *
 * Member-scoped: any org member who can see the marketplace can accept its
 * drift (mirrors the existing on-demand "Sync now" access model).
 */
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

export type IAcceptMarketplaceDriftUseCase = IUseCase<
  AcceptMarketplaceDriftCommand,
  AcceptMarketplaceDriftResponse
>;
