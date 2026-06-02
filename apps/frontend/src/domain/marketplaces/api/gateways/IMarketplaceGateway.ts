import {
  LinkMarketplaceResponse,
  MarketplaceId,
  MarketplaceListItem,
  OrganizationId,
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
}
