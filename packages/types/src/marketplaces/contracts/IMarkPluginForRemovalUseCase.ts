import { IUseCase, PackmindCommand } from '../../UseCase';
import { MarketplaceDistribution } from '../MarketplaceDistribution';
import { MarketplaceDistributionId } from '../MarketplaceDistributionId';
import { MarketplaceId } from '../MarketplaceId';
import { PackageId } from '../../deployments/Package';

/**
 * Admin-only. The target distribution is resolved either directly by
 * `distributionId`, or indirectly by `packageId` — in which case the latest
 * `success`-state distribution for the `(package, marketplace)` pair is picked.
 * A discriminated union, so a caller cannot pass both at once.
 */
export type MarkPluginForRemovalCommand = PackmindCommand & {
  marketplaceId: MarketplaceId;
} & (
    | { distributionId: MarketplaceDistributionId; packageId?: never }
    | { packageId: PackageId; distributionId?: never }
  );

/** The mutated row, so the frontend can update its cache without a refetch. */
export type MarkPluginForRemovalResponse = {
  distribution: MarketplaceDistribution;
};

export type IMarkPluginForRemovalUseCase = IUseCase<
  MarkPluginForRemovalCommand,
  MarkPluginForRemovalResponse
>;
