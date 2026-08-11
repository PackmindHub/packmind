import { IUseCase, PackmindCommand } from '../../UseCase';
import { PluginInstallation } from '../PluginInstallation';
import { MarketplaceId } from '../MarketplaceId';

/**
 * Presentation DTO enriching a `PluginInstallation` row with an optional
 * resolved display name for attributed installs.
 *
 * Expressed as an intersection type (TypeScript good practices standard) so
 * structural drift on the domain type is caught at compile time.
 */
export type PluginInstallationListItem = PluginInstallation & {
  /** Display name of the attributed user, or `null` when anonymous / unresolved. */
  userDisplayName: string | null;
};

/**
 * Command used by any organization member to list all tracked plugin installs
 * for a given marketplace owned by the caller's organization.
 */
export type ListMarketplacePluginInstallsCommand = PackmindCommand & {
  marketplaceId: MarketplaceId;
};

/**
 * Response — all installation rows for the marketplace, enriched with display
 * names. Volume is low; the frontend groups and counts client-side.
 */
export type ListMarketplacePluginInstallsResponse =
  PluginInstallationListItem[];

export type IListMarketplacePluginInstallsUseCase = IUseCase<
  ListMarketplacePluginInstallsCommand,
  ListMarketplacePluginInstallsResponse
>;
