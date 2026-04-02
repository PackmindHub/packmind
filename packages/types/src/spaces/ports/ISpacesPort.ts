import { OrganizationId } from '../../accounts/Organization';
import { UserId } from '../../accounts/User';
import { Space } from '../Space';
import { SpaceId } from '../SpaceId';
import { UserSpaceMembership, UserSpaceRole } from '../UserSpaceMembership';
import {
  AddMembersToSpaceCommand,
  AddMembersToSpaceResponse,
} from '../contracts/IAddMembersToSpaceUseCase';
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
   * Requires admin privileges.
   */
  createSpace(command: CreateSpaceCommand): Promise<CreateSpaceResponse>;

  /**
   * List all spaces for a given organization
   */
  listSpacesByOrganization(organizationId: OrganizationId): Promise<Space[]>;

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
  ): Promise<UserSpaceMembership>;

  /**
   * Add a user membership to a space.
   */
  addSpaceMembership(membership: {
    userId: UserId;
    spaceId: SpaceId;
    role: UserSpaceRole;
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
}
