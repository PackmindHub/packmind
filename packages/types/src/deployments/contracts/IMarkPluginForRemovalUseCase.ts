import { IUseCase, PackmindCommand } from '../../UseCase';
import { MarketplaceDistribution } from '../MarketplaceDistribution';
import { MarketplaceDistributionId } from '../MarketplaceDistributionId';
import { MarketplaceId } from '../MarketplaceId';
import { PackageId } from '../Package';

/**
 * Command used by an organization admin to mark a published marketplace plugin
 * distribution as `to_be_removed`.
 *
 * The target distribution can be resolved either directly by
 * `distributionId`, or indirectly by `packageId` (in which case the latest
 * `success`-state distribution for the `(package, marketplace)` pair is
 * selected). The two shapes form a discriminated union so callers cannot pass
 * both at once.
 */
export type MarkPluginForRemovalCommand = PackmindCommand & {
  marketplaceId: MarketplaceId;
} & (
    | { distributionId: MarketplaceDistributionId; packageId?: never }
    | { packageId: PackageId; distributionId?: never }
  );

/**
 * Response — returns the mutated distribution row so the frontend can update
 * its cache without a refetch.
 */
export type MarkPluginForRemovalResponse = {
  distribution: MarketplaceDistribution;
};

export type IMarkPluginForRemovalUseCase = IUseCase<
  MarkPluginForRemovalCommand,
  MarkPluginForRemovalResponse
>;
