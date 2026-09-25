import { MarketplaceDistributionId } from '../MarketplaceDistributionId';
import { MarketplacesError } from './MarketplacesError';

/**
 * Error thrown when a marketplace plugin distribution cannot be located in the
 * caller's organization — either because the distribution id is unknown, the
 * row has been soft-deleted, or no successful distribution exists for a given
 * `(package, marketplace)` pair when resolving by `packageId`.
 */
export class PluginDistributionNotFoundError extends MarketplacesError {
  constructor(
    public readonly identifier:
      | { distributionId: MarketplaceDistributionId }
      | { packageId: string; marketplaceId: string },
  ) {
    const context =
      'distributionId' in identifier
        ? { distributionId: identifier.distributionId }
        : {
            packageId: identifier.packageId,
            marketplaceId: identifier.marketplaceId,
          };
    const message =
      'distributionId' in identifier
        ? 'The plugin distribution was not found'
        : 'No active marketplace plugin distribution was found for this package on this marketplace';
    super('not_found', 'plugin_distribution_not_found', context, message);
    this.name = 'PluginDistributionNotFoundError';
  }
}
