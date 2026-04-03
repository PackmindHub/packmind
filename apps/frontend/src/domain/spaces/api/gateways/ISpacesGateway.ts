import { ListUserSpacesResponse, Space } from '@packmind/types';
import {
  SpaceMemberEntry,
  SpaceMemberRole,
  ListSpaceMembersResponse,
  AddMembersToSpaceResponse,
  RemoveMemberFromSpaceResponse,
  UpdateMemberRoleResponse,
} from '../../types';

export interface ISpacesGateway {
  getUserSpaces(orgId: string): Promise<ListUserSpacesResponse>;
  getSpaceBySlug(slug: string, orgId: string): Promise<Space>;
  listSpaceMembers(
    orgId: string,
    spaceId: string,
  ): Promise<ListSpaceMembersResponse>;
  addMembersToSpace(
    orgId: string,
    spaceId: string,
    members: SpaceMemberEntry[],
  ): Promise<AddMembersToSpaceResponse>;
  removeMemberFromSpace(
    orgId: string,
    spaceId: string,
    targetUserId: string,
  ): Promise<RemoveMemberFromSpaceResponse>;
  updateMemberRole(
    orgId: string,
    spaceId: string,
    targetUserId: string,
    role: SpaceMemberRole,
  ): Promise<UpdateMemberRoleResponse>;
}
