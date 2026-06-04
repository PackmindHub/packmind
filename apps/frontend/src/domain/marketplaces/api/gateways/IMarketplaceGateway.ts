import {
  CancelPluginRemovalResponse,
  LinkMarketplaceResponse,
  ListMarketplaceDistributionsResponse,
  MarketplaceDistributionId,
  MarketplaceId,
  MarketplaceListItem,
  MarkPluginForRemovalResponse,
  OrganizationId,
  PackageId,
  ValidateMarketplaceUrlResponse,
} from '@packmind/types';

/**
 * Body sent to `linkMarketplace`. Mirrors the API DTO accepted by
 * `POST /organizations/:orgId/marketplaces`.
 */
export type LinkMarketplaceRequestBody = {
  gitProviderId: string;
  owner: string;
  repo: string;
  branch: string;
  name: string;
};

export type UnlinkMarketplaceResult = {
  marketplaceId: MarketplaceId;
};

export interface IMarketplaceGateway {
  /**
   * Returns the list of marketplaces linked to the organization, enriched with
   * `addedByUserName` and a denormalized `pluginCount`.
   */
  listMarketplaces(
    organizationId: OrganizationId,
  ): Promise<MarketplaceListItem[]>;

  /**
   * Links a Git repository as a marketplace via a connected `GitProvider`
   * (private path).
   */
  linkMarketplace(
    organizationId: OrganizationId,
    body: LinkMarketplaceRequestBody,
  ): Promise<LinkMarketplaceResponse>;

  /**
   * Unlinks an enrolled marketplace. The underlying Git repo is never touched.
   */
  unlinkMarketplace(
    organizationId: OrganizationId,
    marketplaceId: MarketplaceId,
  ): Promise<UnlinkMarketplaceResult>;

  /**
   * Pre-flight validates a public marketplace URL through a tokenless
   * `GitProvider` before submitting the link form.
   */
  validateMarketplaceUrl(
    organizationId: OrganizationId,
    url: string,
  ): Promise<ValidateMarketplaceUrlResponse>;

  /**
   * Returns the list of plugin distributions for a given marketplace, enriched
   * with `packageName` and `authorName` per
   * `IListMarketplaceDistributionsUseCase`.
   */
  listDistributions(
    organizationId: OrganizationId,
    marketplaceId: MarketplaceId,
  ): Promise<ListMarketplaceDistributionsResponse>;

  /**
   * Marks a published plugin distribution as `to_be_removed`. Targets the row
   * directly by `distributionId`.
   */
  markPluginForRemovalByDistribution(
    organizationId: OrganizationId,
    marketplaceId: MarketplaceId,
    distributionId: MarketplaceDistributionId,
  ): Promise<MarkPluginForRemovalResponse>;

  /**
   * Marks the latest successful plugin distribution for a given Packmind
   * package on the given marketplace as `to_be_removed`.
   */
  markPluginForRemovalByPackage(
    organizationId: OrganizationId,
    marketplaceId: MarketplaceId,
    packageId: PackageId,
  ): Promise<MarkPluginForRemovalResponse>;

  /**
   * Cancels a previously initiated plugin removal, reverting the target
   * distribution from `to_be_removed` back to `success`.
   */
  cancelPluginRemoval(
    organizationId: OrganizationId,
    marketplaceId: MarketplaceId,
    distributionId: MarketplaceDistributionId,
  ): Promise<CancelPluginRemovalResponse>;
}
