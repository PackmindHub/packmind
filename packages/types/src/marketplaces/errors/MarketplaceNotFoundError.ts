import { MarketplaceId } from '../MarketplaceId';

/**
 * Error thrown when a marketplace cannot be located by id within the caller's
 * organization (either it never existed or it has already been unlinked /
 * soft-deleted).
 */
export class MarketplaceNotFoundError extends Error {
  constructor(public readonly marketplaceId: MarketplaceId) {
    super(`Marketplace with id "${marketplaceId}" was not found`);
    this.name = 'MarketplaceNotFoundError';
  }
}
