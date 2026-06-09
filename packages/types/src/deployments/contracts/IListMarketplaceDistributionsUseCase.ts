import { IUseCase, PackmindCommand } from '../../UseCase';
import { MarketplaceDistribution } from '../MarketplaceDistribution';
import { MarketplaceId } from '../MarketplaceId';

/**
 * Presentation DTO enriching a domain `MarketplaceDistribution` with the
 * Packmind package name and the display name of the author who originally
 * published the plugin. Expressed as an intersection so structural drift on
 * the domain type is caught at compile time per
 * `standard-typescript-good-practices.md`.
 */
export type MarketplaceDistributionListItem = MarketplaceDistribution & {
  packageName: string;
  authorName: string;
};

/**
 * Command used by any organization member to list the distributions for a
 * given marketplace owned by the caller's organization.
 */
export type ListMarketplaceDistributionsCommand = PackmindCommand & {
  marketplaceId: MarketplaceId;
};

export type ListMarketplaceDistributionsResponse =
  MarketplaceDistributionListItem[];

export type IListMarketplaceDistributionsUseCase = IUseCase<
  ListMarketplaceDistributionsCommand,
  ListMarketplaceDistributionsResponse
>;
