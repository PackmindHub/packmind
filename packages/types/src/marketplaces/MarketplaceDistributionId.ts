import { Branded, brandedIdFactory } from '../brandedTypes';

export type MarketplaceDistributionId = Branded<'MarketplaceDistributionId'>;
export const createMarketplaceDistributionId =
  brandedIdFactory<MarketplaceDistributionId>();
