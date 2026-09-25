import { MarketplaceId } from '../MarketplaceId';
import { MarketplacesError } from './MarketplacesError';

/**
 * Error thrown when a marketplace cannot be located by id within the caller's
 * organization (either it never existed or it has already been unlinked /
 * soft-deleted).
 */
export class MarketplaceNotFoundError extends MarketplacesError {
  constructor(public readonly marketplaceId: MarketplaceId) {
    super(
      'not_found',
      'marketplace_not_found',
      { marketplaceId },
      'This marketplace does not exist, or it has been unlinked.',
    );
    this.name = 'MarketplaceNotFoundError';
  }
}
