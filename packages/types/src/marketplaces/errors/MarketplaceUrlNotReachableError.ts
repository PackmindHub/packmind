import { MarketplacesError } from './MarketplacesError';

/**
 * Error thrown when no tokenless Git provider can reach the host derived from
 * the supplied public URL — the URL is malformed, the host is unknown, or the
 * provider lacks a credential.
 *
 * Covers only caller-correctable cases: transport failures use
 * `MarketplaceRepositoryUnreachableError` instead. The original URL is
 * preserved so the API surface and frontend can map this error to the
 * playground prototype's `not-public | not-reachable` UX categories without
 * re-parsing the input.
 */
export class MarketplaceUrlNotReachableError extends MarketplacesError {
  constructor(public readonly url: string) {
    super(
      'invalid_input',
      'marketplace_url_not_reachable',
      { marketplaceUrl: url },
      `Marketplace URL "${url}" is not reachable`,
    );
    this.name = 'MarketplaceUrlNotReachableError';
  }
}
