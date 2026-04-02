import { ListUserSpacesResponse, Space } from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { ISpacesGateway } from './ISpacesGateway';
import {
  AddMembersToSpaceResponse,
  ListSpaceMembersResponse,
  RemoveMemberFromSpaceResponse,
  SpaceMemberEntry,
  SpaceMemberRole,
  UpdateMemberRoleResponse,
} from '../../types';

export class SpacesGatewayApi
  extends PackmindGateway
  implements ISpacesGateway
{
  constructor() {
    super('/organizations');
  }

  async getUserSpaces(orgId: string): Promise<ListUserSpacesResponse> {
    if (!orgId) {
      throw new Error('Organization ID is required to fetch spaces');
    }
    return this._api.get<ListUserSpacesResponse>(
      `${this._endpoint}/${orgId}/spaces`,
    );
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

  async listSpaceMembers(
    orgId: string,
    spaceId: string,
  ): Promise<ListSpaceMembersResponse> {
    return this._api.get<ListSpaceMembersResponse>(
      `${this._endpoint}/${orgId}/spaces/${spaceId}/members`,
    );
  }

  async addMembersToSpace(
    orgId: string,
    spaceId: string,
    members: SpaceMemberEntry[],
  ): Promise<AddMembersToSpaceResponse> {
    return this._api.post<AddMembersToSpaceResponse>(
      `${this._endpoint}/${orgId}/spaces/${spaceId}/members`,
      { members },
    );
  }

  async removeMemberFromSpace(
    orgId: string,
    spaceId: string,
    targetUserId: string,
  ): Promise<RemoveMemberFromSpaceResponse> {
    return this._api.delete<RemoveMemberFromSpaceResponse>(
      `${this._endpoint}/${orgId}/spaces/${spaceId}/members/${targetUserId}`,
    );
  }

  async updateMemberRole(
    orgId: string,
    spaceId: string,
    targetUserId: string,
    role: SpaceMemberRole,
  ): Promise<UpdateMemberRoleResponse> {
    return this._api.patch<UpdateMemberRoleResponse>(
      `${this._endpoint}/${orgId}/spaces/${spaceId}/members/${targetUserId}`,
      { role },
    );
  }
}
