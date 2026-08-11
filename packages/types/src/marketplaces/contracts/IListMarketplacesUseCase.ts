import { IUseCase, PackmindCommand } from '../../UseCase';
import { MarketplaceListItem } from '../MarketplaceListItem';

/**
 * Command used by any organization member to list marketplaces linked to the
 * caller's organization. No additional parameters are required beyond the
 * standard auth context carried by `PackmindCommand`.
 */
export type ListMarketplacesCommand = PackmindCommand;

/**
 * Response — list of presentation DTOs enriched with `addedByUserName` and
 * carrying the denormalized `pluginCount` from the row.
 */
export type ListMarketplacesResponse = MarketplaceListItem[];

export type IListMarketplacesUseCase = IUseCase<
  ListMarketplacesCommand,
  ListMarketplacesResponse
>;
