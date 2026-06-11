import { IMarketplaceGateway } from './IMarketplaceGateway';
import { MarketplaceGatewayApi } from './MarketplaceGatewayApi';

export * from './IMarketplaceGateway';
export * from './MarketplaceGatewayApi';

export const marketplaceGateway: IMarketplaceGateway =
  new MarketplaceGatewayApi();
