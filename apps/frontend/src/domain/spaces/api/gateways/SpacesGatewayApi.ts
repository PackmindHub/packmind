import { Space } from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { ISpacesGateway } from './ISpacesGateway';

export class SpacesGatewayApi
  extends PackmindGateway
  implements ISpacesGateway
{
  constructor() {
    super('/organizations');
  }

  async getSpaces(orgId: string): Promise<Space[]> {
    if (!orgId) {
      throw new Error('Organization ID is required to fetch spaces');
    }
    return this._api.get<Space[]>(`${this._endpoint}/${orgId}/spaces`);
  }

  async getSpaceBySlug(slug: string, orgId: string): Promise<Space> {
    if (!orgId) {
      throw new Error('Organization ID is required to fetch space');
    }
    if (!slug) {
      throw new Error('Space slug is required to fetch space');
    }
    return this._api.get<Space>(`${this._endpoint}/${orgId}/spaces/${slug}`);
  }
}
