import { IUseCase, PackmindCommand } from '../../UseCase';
import { MarketplaceDistribution } from '../MarketplaceDistribution';
import { MarketplaceDistributionId } from '../MarketplaceDistributionId';

/** Member-scoped, and used by the controller's polling endpoint. */
export type FindMarketplaceDistributionByIdCommand = PackmindCommand & {
  marketplaceDistributionId: MarketplaceDistributionId;
};

/**
 * `marketplaceDistribution` is `null` both when the row is missing and when it
 * belongs to another organization — the two are deliberately indistinguishable,
 * and callers should map either to HTTP 404.
 */
export type FindMarketplaceDistributionByIdResponse = {
  marketplaceDistribution: MarketplaceDistribution | null;
};

export type IFindMarketplaceDistributionByIdUseCase = IUseCase<
  FindMarketplaceDistributionByIdCommand,
  FindMarketplaceDistributionByIdResponse
>;
