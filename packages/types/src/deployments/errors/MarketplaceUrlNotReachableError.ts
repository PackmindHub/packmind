/**
 * Error thrown by `ValidateMarketplaceUrlUseCase` when no tokenless Git
 * provider can reach the host derived from the supplied public URL (e.g.
 * the host is unknown, the URL is malformed, or every reachable provider
 * returned an unrecoverable transport error).
 *
 * The original URL is preserved so the API surface and frontend can map this
 * error to the playground prototype's `not-public | not-reachable` UX
 * categories without re-parsing the input.
 */
export class MarketplaceUrlNotReachableError extends Error {
  constructor(public readonly url: string) {
    super(`Marketplace URL "${url}" is not reachable`);
    this.name = 'MarketplaceUrlNotReachableError';
  }
}
