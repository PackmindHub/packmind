import { ListUserSpacesResponse, Space } from '@packmind/types';
import {
  SpaceMemberEntry,
  ListSpaceMembersResponse,
  AddMembersToSpaceResponse,
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
}
