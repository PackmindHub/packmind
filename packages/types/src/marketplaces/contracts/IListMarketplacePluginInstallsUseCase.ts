import { IUseCase, PackmindCommand } from '../../UseCase';
import { PluginInstallation } from '../PluginInstallation';
import { MarketplaceId } from '../MarketplaceId';

/**
 * Expressed as an intersection, per the TypeScript good practices standard, so
 * structural drift on `PluginInstallation` is caught at compile time.
 */
export type PluginInstallationListItem = PluginInstallation & {
  /** Display name of the attributed user, or `null` when anonymous / unresolved. */
  userDisplayName: string | null;
};

export type ListMarketplacePluginInstallsCommand = PackmindCommand & {
  marketplaceId: MarketplaceId;
};

/**
 * Deliberately unpaginated: volume is low, and the frontend groups and counts
 * client-side.
 */
export type ListMarketplacePluginInstallsResponse =
  PluginInstallationListItem[];

export type IListMarketplacePluginInstallsUseCase = IUseCase<
  ListMarketplacePluginInstallsCommand,
  ListMarketplacePluginInstallsResponse
>;
