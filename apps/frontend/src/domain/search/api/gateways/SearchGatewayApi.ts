import { SearchResponse } from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { ISearchGateway } from './ISearchGateway';

/**
 * HTTP gateway for the org-scoped global search endpoint.
 * GET /api/v0/organizations/:orgId/search?q=<term>
 */
export class SearchGatewayApi
  extends PackmindGateway
  implements ISearchGateway
{
  constructor() {
    super('/organizations');
  }

  async search(organizationId: string, query: string): Promise<SearchResponse> {
    if (!organizationId) {
      throw new Error('Organization ID is required to search');
    }
    return this._api.get<SearchResponse>(
      `${this._endpoint}/${organizationId}/search?q=${encodeURIComponent(query)}`,
    );
  }
}
