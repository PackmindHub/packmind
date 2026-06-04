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
  SyncMarketplaceNowResponse,
  ValidateMarketplaceUrlResponse,
} from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import {
  IMarketplaceGateway,
  LinkMarketplaceRequestBody,
  UnlinkMarketplaceResult,
} from './IMarketplaceGateway';

/**
 * Axios-backed gateway for the marketplace HTTP surface (group J).
 *
 * Routes:
 *  - `POST   /organizations/:orgId/marketplaces`
 *  - `DELETE /organizations/:orgId/marketplaces/:marketplaceId`
 *  - `GET    /organizations/:orgId/marketplaces`
 *  - `GET    /organizations/:orgId/marketplaces/validate-url?url=...`
 *
 * Error handling delegates to the shared `ApiService`, which surfaces
 * `PackmindError`/`PackmindConflictError` for typed handling upstream.
 */
export class MarketplaceGatewayApi
  extends PackmindGateway
  implements IMarketplaceGateway
{
  constructor() {
    super('/organizations');
  }

  async listMarketplaces(
    organizationId: OrganizationId,
  ): Promise<MarketplaceListItem[]> {
    return this._api.get<MarketplaceListItem[]>(
      `${this._endpoint}/${organizationId}/marketplaces`,
    );
  }

  async linkMarketplace(
    organizationId: OrganizationId,
    body: LinkMarketplaceRequestBody,
  ): Promise<LinkMarketplaceResponse> {
    return this._api.post<LinkMarketplaceResponse>(
      `${this._endpoint}/${organizationId}/marketplaces`,
      body,
    );
  }

  async unlinkMarketplace(
    organizationId: OrganizationId,
    marketplaceId: MarketplaceId,
  ): Promise<UnlinkMarketplaceResult> {
    return this._api.delete<UnlinkMarketplaceResult>(
      `${this._endpoint}/${organizationId}/marketplaces/${marketplaceId}`,
    );
  }

  async validateMarketplaceUrl(
    organizationId: OrganizationId,
    url: string,
  ): Promise<ValidateMarketplaceUrlResponse> {
    return this._api.get<ValidateMarketplaceUrlResponse>(
      `${this._endpoint}/${organizationId}/marketplaces/validate-url`,
      { params: { url } },
    );
  }

  async listDistributions(
    organizationId: OrganizationId,
    marketplaceId: MarketplaceId,
  ): Promise<ListMarketplaceDistributionsResponse> {
    return this._api.get<ListMarketplaceDistributionsResponse>(
      `${this._endpoint}/${organizationId}/marketplaces/${marketplaceId}/distributions`,
    );
  }

  async markPluginForRemovalByDistribution(
    organizationId: OrganizationId,
    marketplaceId: MarketplaceId,
    distributionId: MarketplaceDistributionId,
  ): Promise<MarkPluginForRemovalResponse> {
    return this._api.post<MarkPluginForRemovalResponse>(
      `${this._endpoint}/${organizationId}/marketplaces/${marketplaceId}/distributions/${distributionId}/removal`,
      {},
    );
  }

  async markPluginForRemovalByPackage(
    organizationId: OrganizationId,
    marketplaceId: MarketplaceId,
    packageId: PackageId,
  ): Promise<MarkPluginForRemovalResponse> {
    return this._api.post<MarkPluginForRemovalResponse>(
      `${this._endpoint}/${organizationId}/marketplaces/${marketplaceId}/packages/${packageId}/removal`,
      {},
    );
  }

  async cancelPluginRemoval(
    organizationId: OrganizationId,
    marketplaceId: MarketplaceId,
    distributionId: MarketplaceDistributionId,
  ): Promise<CancelPluginRemovalResponse> {
    return this._api.delete<CancelPluginRemovalResponse>(
      `${this._endpoint}/${organizationId}/marketplaces/${marketplaceId}/distributions/${distributionId}/removal`,
    );
  }

  async syncMarketplaceNow(
    organizationId: OrganizationId,
    marketplaceId: MarketplaceId,
  ): Promise<SyncMarketplaceNowResponse> {
    return this._api.post<SyncMarketplaceNowResponse>(
      `${this._endpoint}/${organizationId}/marketplaces/${marketplaceId}/reconcile`,
      {},
    );
  }
}
