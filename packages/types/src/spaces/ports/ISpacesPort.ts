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

/**
 * Port interface for cross-domain access to Spaces functionality
 * Following DDD monorepo architecture standard
 */
export const ISpacesPortName = 'ISpacesPort' as const;

export interface ISpacesPort {
  /**
   * Create the default "Global" space for a new organization.
   * System-level operation, no user context required.
   */
  createDefaultSpace(organizationId: OrganizationId): Promise<Space>;

  /**
   * Create a space for an organization (user-initiated).
   * Requires organization membership.
   */
  createSpace(command: CreateSpaceCommand): Promise<CreateSpaceResponse>;

  /**
   * List all spaces for a given organization
   */
  listSpacesByOrganization(organizationId: OrganizationId): Promise<Space[]>;

  /**
   * Return a paginated page of spaces for an organization, used by the
   * organization spaces management listing. Spaces are ordered with the
   * default space first, then by creation time ascending.
   */
  findOrgPagePaginated(
    organizationId: OrganizationId,
    page: number,
    pageSize: number,
  ): Promise<{ items: Space[]; totalCount: number }>;

  /**
   * Get a space by its slug within an organization
   * Returns null if the space doesn't exist
   */
  getSpaceBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Space | null>;

  /**
   * Get a space by its ID
   * Returns null if the space doesn't exist
   */
  getSpaceById(spaceId: SpaceId): Promise<Space | null>;

  /**
   * List spaces for the authenticated user's organization.
   * Returns all organization spaces; discoverableSpaces is always empty.
   */
  listUserSpaces(
    command: ListUserSpacesCommand,
  ): Promise<ListUserSpacesResponse>;

  /**
   * Get the default space for the authenticated user's organization.
   * Throws DefaultSpaceNotFoundError if no default space exists.
   */
  getDefaultSpace(
    command: GetDefaultSpaceCommand,
  ): Promise<GetDefaultSpaceResponse>;

  /**
   * Add a user as a member of the default space for an organization.
   * Finds the default space and creates the membership.
   */
  addMemberToDefaultSpace(
    userId: UserId,
    organizationId: OrganizationId,
    role: UserSpaceRole,
    createdBy: UserId,
  ): Promise<UserSpaceMembership>;

  /**
   * Add a user membership to a space.
   */
  addSpaceMembership(membership: {
    userId: UserId;
    spaceId: SpaceId;
    role: UserSpaceRole;
    createdBy: UserId;
  }): Promise<UserSpaceMembership>;

  /**
   * Find all space memberships for a user within an organization.
   */
  findMembershipsByUserAndOrganization(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<UserSpaceMembership[]>;

  /**
   * List all members of a specific space.
   */
  listSpaceMembers(
    command: ListSpaceMembersCommand,
  ): Promise<ListSpaceMembersResponse>;

  /**
   * Add multiple members to a space in batch.
   */
  addMembersToSpace(
    command: AddMembersToSpaceCommand,
  ): Promise<AddMembersToSpaceResponse>;

  /**
   * Remove a member from a space.
   * Requires the caller to be a space admin.
   * Cannot remove from default space or remove self.
   */
  removeMemberFromSpace(
    command: RemoveMemberFromSpaceCommand,
  ): Promise<RemoveMemberFromSpaceResponse>;

  /**
   * Update a member's role in a space.
   * Requires the caller to be a space admin.
   * Cannot update own role.
   */
  updateMemberRole(
    command: UpdateMemberRoleCommand,
  ): Promise<UpdateMemberRoleResponse>;

  /**
   * Update the pinned status of a user's membership in a space.
   */
  updateMembershipPinned(
    userId: UserId,
    spaceId: SpaceId,
    pinned: boolean,
  ): Promise<boolean>;

  /**
   * Remove all space memberships for a user within an organization.
   * Used when a user is removed from the organization.
   */
  removeUserFromOrganizationSpaces(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<void>;

  /**
   * Find a user's membership in a specific space.
   * Returns null if the user is not a member of the space.
   */
  findMembership(
    userId: UserId,
    spaceId: SpaceId,
  ): Promise<UserSpaceMembership | null>;

  /**
   * Remove a user's membership from a specific space.
   * Low-level operation without admin checks.
   */
  removeSpaceMembership(userId: UserId, spaceId: SpaceId): Promise<boolean>;

  /**
   * Update a space's mutable fields (name, type, color).
   * Slug remains stable — collision is checked but slug is not regenerated.
   * Returns the updated space.
   */
  updateSpace(
    spaceId: SpaceId,
    fields: { name?: string; type?: SpaceType; color?: SpaceColor },
  ): Promise<Space>;

  /**
   * Soft-delete a space.
   */
  deleteSpace(spaceId: SpaceId, deletedBy: UserId): Promise<void>;

  /**
   * Soft-delete all memberships for a space.
   * Returns the number of memberships soft-deleted.
   */
  softDeleteMembershipsBySpaceId(
    spaceId: SpaceId,
    deletedBy: UserId,
  ): Promise<number>;

  /**
   * Find admin memberships for the given space IDs joined with the User
   * entity. Returns a flat array (one row per admin per space) with the
   * user's id and presentation displayName.
   */
  findAdminsForSpaceIds(
    spaceIds: SpaceId[],
  ): Promise<
    Array<{ spaceId: SpaceId; user: { id: UserId; displayName: string } }>
  >;

  /**
   * Count active memberships grouped by space for a given role.
   * Spaces with zero matching memberships are absent from the returned Map.
   */
  countByRoleForSpaceIds(
    spaceIds: SpaceId[],
    role: UserSpaceRole,
  ): Promise<Map<SpaceId, number>>;

  /**
   * Count active memberships grouped by space across all roles.
   * Spaces with zero memberships are absent from the returned Map.
   */
  countUsersForSpaceIds(spaceIds: SpaceId[]): Promise<Map<SpaceId, number>>;

  /**
   * Find member user IDs grouped by space for the given space IDs.
   * Spaces with zero memberships are absent from the returned Map.
   */
  findMemberIdsForSpaceIds(
    spaceIds: SpaceId[],
  ): Promise<Map<SpaceId, UserId[]>>;
}
