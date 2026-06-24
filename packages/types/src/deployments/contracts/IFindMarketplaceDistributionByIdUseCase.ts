import { IUseCase, PackmindCommand } from '../../UseCase';
import { MarketplaceDistribution } from '../MarketplaceDistribution';
import { MarketplaceDistributionId } from '../MarketplaceDistributionId';

/**
 * Member-scoped command used by the controller's polling endpoint to look up
 * a single `MarketplaceDistribution` row by id, scoped to the caller's
 * organization.
 */
export type FindMarketplaceDistributionByIdCommand = PackmindCommand & {
  marketplaceDistributionId: MarketplaceDistributionId;
};

/**
 * Response wraps the optional row so the contract can be extended later
 * (e.g. to carry a transient PR url or a join-loaded marketplace) without
 * a breaking change to every caller. `marketplaceDistribution` is `null`
 * when the row is missing or belongs to another organization — callers
 * should map that to HTTP 404.
 */
export type FindMarketplaceDistributionByIdResponse = {
  marketplaceDistribution: MarketplaceDistribution | null;
};

export type IFindMarketplaceDistributionByIdUseCase = IUseCase<
  FindMarketplaceDistributionByIdCommand,
  FindMarketplaceDistributionByIdResponse
>;
