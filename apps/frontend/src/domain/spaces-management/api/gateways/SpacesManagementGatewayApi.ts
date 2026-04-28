import {
  BrowseSpacesResponse,
  Space,
  SpaceColor,
  SpaceId,
  SpaceType,
} from '@packmind/types';
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

  async browseSpaces(orgId: string): Promise<BrowseSpacesResponse> {
    if (!orgId) {
      throw new Error('Organization ID is required to browse spaces');
    }
    return this._api.get<BrowseSpacesResponse>(
      `${this._endpoint}/${orgId}/spaces-management/browse`,
    );
  }

  async joinSpace(orgId: string, spaceId: SpaceId): Promise<void> {
    if (!orgId) {
      throw new Error('Organization ID is required to join a space');
    }
    return this._api.post(
      `${this._endpoint}/${orgId}/spaces-management/${spaceId}/join`,
      {},
    );
  }

  async joinSpaceBySlug(orgId: string, spaceSlug: string): Promise<void> {
    if (!orgId) {
      throw new Error('Organization ID is required to join a space');
    }
    return this._api.post(
      `${this._endpoint}/${orgId}/spaces-management/by-slug/${spaceSlug}/join`,
      {},
    );
  }

  async leaveSpace(orgId: string, spaceId: SpaceId): Promise<void> {
    if (!orgId) {
      throw new Error('Organization ID is required to leave a space');
    }
    return this._api.post(
      `${this._endpoint}/${orgId}/spaces-management/${spaceId}/leave`,
      {},
    );
  }

  async updateSpace(
    orgId: string,
    spaceId: SpaceId,
    fields: { name?: string; type?: SpaceType; color?: SpaceColor },
  ): Promise<Space> {
    if (!orgId) {
      throw new Error('Organization ID is required to update a space');
    }
    return this._api.patch<Space>(
      `${this._endpoint}/${orgId}/spaces-management/${spaceId}`,
      fields,
    );
  }

  async deleteSpace(orgId: string, spaceId: string): Promise<void> {
    if (!orgId) {
      throw new Error('Organization ID is required to delete a space');
    }
    return this._api.delete(
      `${this._endpoint}/${orgId}/spaces-management/${spaceId}`,
    );
  }

  async pinSpace(orgId: string, spaceId: SpaceId): Promise<void> {
    if (!orgId) {
      throw new Error('Organization ID is required to pin a space');
    }
    return this._api.post(
      `${this._endpoint}/${orgId}/spaces-management/${spaceId}/pin`,
      {},
    );
  }

  async unpinSpace(orgId: string, spaceId: SpaceId): Promise<void> {
    if (!orgId) {
      throw new Error('Organization ID is required to unpin a space');
    }
    return this._api.post(
      `${this._endpoint}/${orgId}/spaces-management/${spaceId}/unpin`,
      {},
    );
  }
}
