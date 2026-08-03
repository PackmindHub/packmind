import { IUseCase, PackmindCommand } from '../../UseCase';
import { MarketplaceId } from '../MarketplaceId';

/**
 * Command used by an organization admin to unlink a previously linked
 * marketplace. The marketplace must belong to the caller's organization.
 */
export type UnlinkMarketplaceCommand = PackmindCommand & {
  marketplaceId: MarketplaceId;
};

/**
 * Minimal response — the caller already knows the rest of the marketplace
 * row at this point. Returning the id keeps the contract symmetric with
 * other delete-style use cases and simplifies cache invalidation on the
 * frontend.
 */
export type UnlinkMarketplaceResponse = {
  marketplaceId: MarketplaceId;
};

export type IUnlinkMarketplaceUseCase = IUseCase<
  UnlinkMarketplaceCommand,
  UnlinkMarketplaceResponse
>;
