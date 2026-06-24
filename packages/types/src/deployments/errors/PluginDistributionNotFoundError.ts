import { MarketplaceDistributionId } from '../MarketplaceDistributionId';

/**
 * Error thrown when a marketplace plugin distribution cannot be located in the
 * caller's organization — either because the distribution id is unknown, the
 * row has been soft-deleted, or no successful distribution exists for a given
 * `(package, marketplace)` pair when resolving by `packageId`.
 */
export class PluginDistributionNotFoundError extends Error {
  constructor(
    public readonly identifier:
      | { distributionId: MarketplaceDistributionId }
      | { packageId: string; marketplaceId: string },
  ) {
    const message =
      'distributionId' in identifier
        ? `Marketplace plugin distribution with id "${identifier.distributionId}" was not found`
        : `No active marketplace plugin distribution was found for package "${identifier.packageId}" on marketplace "${identifier.marketplaceId}"`;
    super(message);
    this.name = 'PluginDistributionNotFoundError';
  }
}
