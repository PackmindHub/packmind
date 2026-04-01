import { Space } from '@packmind/types';
import {
  SpaceMemberEntry,
  ListSpaceMembersResponse,
  AddMembersToSpaceResponse,
} from '../../types';

export interface ISpacesGateway {
  getSpaces(orgId: string): Promise<Space[]>;
  getSpaceBySlug(slug: string, orgId: string): Promise<Space>;
  listSpaceMembers(
    orgId: string,
    spaceSlug: string,
  ): Promise<ListSpaceMembersResponse>;
  addMembersToSpace(
    orgId: string,
    spaceSlug: string,
    members: SpaceMemberEntry[],
  ): Promise<AddMembersToSpaceResponse>;
}
