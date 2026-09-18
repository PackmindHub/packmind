import { OrganizationId } from '../../accounts/Organization';
import { UserId } from '../../accounts/User';
import { Space, SpaceType } from '../Space';
import { SpaceColor } from '../SpaceColor';
import { SpaceId } from '../SpaceId';
import { UserSpaceMembership, UserSpaceRole } from '../UserSpaceMembership';
import {
  AddMembersToSpaceCommand,
  AddMembersToSpaceResponse,
} from '../contracts/IAddMembersToSpaceUseCase';
import {
  RemoveMemberFromSpaceCommand,
  RemoveMemberFromSpaceResponse,
} from '../contracts/IRemoveMemberFromSpaceUseCase';
import {
  UpdateMemberRoleCommand,
  UpdateMemberRoleResponse,
} from '../contracts/IUpdateMemberRoleUseCase';
import {
  CreateSpaceCommand,
  CreateSpaceResponse,
} from '../contracts/ICreateSpaceUseCase';
import {
  GetDefaultSpaceCommand,
  GetDefaultSpaceResponse,
} from '../contracts/IGetDefaultSpace';
import {
  ListSpaceMembersCommand,
  ListSpaceMembersResponse,
} from '../contracts/IListSpaceMembersUseCase';
import {
  ListUserSpacesCommand,
  ListUserSpacesResponse,
} from '../contracts/IListUserSpaces';

export const ISpacesPortName = 'ISpacesPort' as const;

export interface ISpacesPort {
  /**
   * Creates the default "Global" space. System-level operation, deliberately
   * taking no user context so organization creation can call it.
   */
  createDefaultSpace(organizationId: OrganizationId): Promise<Space>;

  /** Requires organization membership, unlike createDefaultSpace. */
  createSpace(command: CreateSpaceCommand): Promise<CreateSpaceResponse>;

  listSpacesByOrganization(organizationId: OrganizationId): Promise<Space[]>;

  /** Ordered with the default space first, then by creation time ascending. */
  findOrgPagePaginated(
    organizationId: OrganizationId,
    page: number,
    pageSize: number,
  ): Promise<{ items: Space[]; totalCount: number }>;

  getSpaceBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Space | null>;

  getSpaceById(spaceId: SpaceId): Promise<Space | null>;

  /** Only the spaces the calling user is a member of. */
  listUserSpaces(
    command: ListUserSpacesCommand,
  ): Promise<ListUserSpacesResponse>;

  /** Throws DefaultSpaceNotFoundError if no default space exists. */
  getDefaultSpace(
    command: GetDefaultSpaceCommand,
  ): Promise<GetDefaultSpaceResponse>;

  addMemberToDefaultSpace(
    userId: UserId,
    organizationId: OrganizationId,
    role: UserSpaceRole,
    createdBy: UserId,
  ): Promise<UserSpaceMembership>;

  addSpaceMembership(membership: {
    userId: UserId;
    spaceId: SpaceId;
    role: UserSpaceRole;
    createdBy: UserId;
  }): Promise<UserSpaceMembership>;

  findMembershipsByUserAndOrganization(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<UserSpaceMembership[]>;

  listSpaceMembers(
    command: ListSpaceMembersCommand,
  ): Promise<ListSpaceMembersResponse>;

  addMembersToSpace(
    command: AddMembersToSpaceCommand,
  ): Promise<AddMembersToSpaceResponse>;

  /**
   * Requires the caller to be a space admin. Cannot remove from the default
   * space, and cannot remove self.
   */
  removeMemberFromSpace(
    command: RemoveMemberFromSpaceCommand,
  ): Promise<RemoveMemberFromSpaceResponse>;

  /** Requires the caller to be a space admin. Cannot update own role. */
  updateMemberRole(
    command: UpdateMemberRoleCommand,
  ): Promise<UpdateMemberRoleResponse>;

  updateMembershipPinned(
    userId: UserId,
    spaceId: SpaceId,
    pinned: boolean,
  ): Promise<boolean>;

  /** Used when a user is removed from the organization. */
  removeUserFromOrganizationSpaces(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<void>;

  findMembership(
    userId: UserId,
    spaceId: SpaceId,
  ): Promise<UserSpaceMembership | null>;

  /** Low-level operation, without the admin checks removeMemberFromSpace applies. */
  removeSpaceMembership(userId: UserId, spaceId: SpaceId): Promise<boolean>;

  /**
   * Slug remains stable — collision is checked but the slug is not
   * regenerated from the new name.
   */
  updateSpace(
    spaceId: SpaceId,
    fields: { name?: string; type?: SpaceType; color?: SpaceColor },
  ): Promise<Space>;

  /** Soft delete. */
  deleteSpace(spaceId: SpaceId, deletedBy: UserId): Promise<void>;

  /** Soft delete. Resolves to the number of memberships affected. */
  softDeleteMembershipsBySpaceId(
    spaceId: SpaceId,
    deletedBy: UserId,
  ): Promise<number>;

  /** Flat array: one row per admin per space. */
  findAdminsForSpaceIds(
    spaceIds: SpaceId[],
  ): Promise<
    Array<{ spaceId: SpaceId; user: { id: UserId; displayName: string } }>
  >;

  /** Spaces with no matching membership are absent from the Map, not zero. */
  countByRoleForSpaceIds(
    spaceIds: SpaceId[],
    role: UserSpaceRole,
  ): Promise<Map<SpaceId, number>>;

  /** Spaces with no membership are absent from the Map, not zero. */
  countUsersForSpaceIds(spaceIds: SpaceId[]): Promise<Map<SpaceId, number>>;

  /** Spaces with no membership are absent from the Map. */
  findMemberIdsForSpaceIds(
    spaceIds: SpaceId[],
  ): Promise<Map<SpaceId, UserId[]>>;
}
