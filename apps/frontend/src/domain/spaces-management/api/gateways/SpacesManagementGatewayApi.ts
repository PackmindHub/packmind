import { Space, SpaceType } from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import {
  ISpacesManagementGateway,
  MoveArtifactsToSpaceParams,
  MoveArtifactsToSpaceResponse,
} from './ISpacesManagementGateway';

export class SpacesManagementGatewayApi
  extends PackmindGateway
  implements ISpacesManagementGateway
{
  constructor() {
    super('/organizations');
  }

  async createSpace(
    orgId: string,
    name: string,
    type: SpaceType,
  ): Promise<Space> {
    if (!orgId) {
      throw new Error('Organization ID is required to create a space');
    }
    return this._api.post<Space>(
      `${this._endpoint}/${orgId}/spaces-management`,
      { name, type },
    );
  }

  async moveArtifactsToSpace(
    orgId: string,
    params: MoveArtifactsToSpaceParams,
  ): Promise<MoveArtifactsToSpaceResponse> {
    if (!orgId) {
      throw new Error(
        'Organization ID is required to move artifacts to a space',
      );
    }
    return this._api.post<MoveArtifactsToSpaceResponse>(
      `${this._endpoint}/${orgId}/spaces-management/move`,
      params,
    );
  }
}
