import { IUseCase, PackmindCommand } from '../../UseCase';
import { MarketplaceId } from '../MarketplaceId';

/** Admin-only. The marketplace must belong to the caller's organization. */
export type UnlinkMarketplaceCommand = PackmindCommand & {
  marketplaceId: MarketplaceId;
};

/**
 * Just the id: the caller already holds the rest of the row, and an id is what
 * the frontend needs to invalidate its cache.
 */
export type UnlinkMarketplaceResponse = {
  marketplaceId: MarketplaceId;
};

export type IUnlinkMarketplaceUseCase = IUseCase<
  UnlinkMarketplaceCommand,
  UnlinkMarketplaceResponse
>;
