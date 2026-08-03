import { Branded, brandedIdFactory } from '../brandedTypes';

export type MarketplaceId = Branded<'MarketplaceId'>;
export const createMarketplaceId = brandedIdFactory<MarketplaceId>();
