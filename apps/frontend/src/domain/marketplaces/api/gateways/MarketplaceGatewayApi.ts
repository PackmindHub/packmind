import {
  LinkMarketplaceResponse,
  MarketplaceId,
  MarketplaceListItem,
  OrganizationId,
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
}
