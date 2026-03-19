import { Space } from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { ISpacesManagementGateway } from './ISpacesManagementGateway';

export class SpacesManagementGatewayApi
  extends PackmindGateway
  implements ISpacesManagementGateway
{
  constructor() {
    super('/organizations');
  }

  async createSpace(orgId: string, name: string): Promise<Space> {
    if (!orgId) {
      throw new Error('Organization ID is required to create a space');
    }
    return this._api.post<Space>(
      `${this._endpoint}/${orgId}/spaces-management`,
      { name },
    );
  }
}
