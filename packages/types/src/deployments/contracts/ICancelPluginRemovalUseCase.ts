import { IUseCase, PackmindCommand } from '../../UseCase';
import { MarketplaceDistribution } from '../MarketplaceDistribution';
import { MarketplaceDistributionId } from '../MarketplaceDistributionId';
import { MarketplaceId } from '../MarketplaceId';

/**
 * Command used by an organization admin to cancel a previously initiated
 * plugin removal, reverting the target distribution from `to_be_removed`
 * back to `success`. No domain event is emitted (cancellations are not
 * tracked in v1).
 */
export type CancelPluginRemovalCommand = PackmindCommand & {
  marketplaceId: MarketplaceId;
  distributionId: MarketplaceDistributionId;
};

/**
 * Response — returns the mutated distribution row so the frontend can update
 * its cache without a refetch.
 */
export type CancelPluginRemovalResponse = {
  distribution: MarketplaceDistribution;
};

export type ICancelPluginRemovalUseCase = IUseCase<
  CancelPluginRemovalCommand,
  CancelPluginRemovalResponse
>;
