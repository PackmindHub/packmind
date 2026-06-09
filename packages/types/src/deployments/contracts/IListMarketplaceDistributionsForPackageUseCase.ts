import { IUseCase, PackmindCommand } from '../../UseCase';
import { MarketplaceDistribution } from '../MarketplaceDistribution';
import { PackageId } from '../Package';

/**
 * Member-scoped command used by the frontend status helper to fetch every
 * marketplace distribution row for a single package (newest first).
 */
export type ListMarketplaceDistributionsForPackageCommand = PackmindCommand & {
  packageId: PackageId;
};

/**
 * Response — list of marketplace distribution rows, ordered most recent
 * first. Empty when the package has never been published to a marketplace.
 */
export type ListMarketplaceDistributionsForPackageResponse =
  MarketplaceDistribution[];

export type IListMarketplaceDistributionsForPackageUseCase = IUseCase<
  ListMarketplaceDistributionsForPackageCommand,
  ListMarketplaceDistributionsForPackageResponse
>;
