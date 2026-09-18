import { IUseCase, PackmindCommand } from '../../UseCase';
import { MarketplaceListItem } from '../MarketplaceListItem';

/** Open to any organization member. */
export type ListMarketplacesCommand = PackmindCommand;

export type ListMarketplacesResponse = MarketplaceListItem[];

export type IListMarketplacesUseCase = IUseCase<
  ListMarketplacesCommand,
  ListMarketplacesResponse
>;
