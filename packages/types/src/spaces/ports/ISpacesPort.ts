import { OrganizationId } from '../../accounts/Organization';
import { Space } from '../Space';
import { SpaceId } from '../SpaceId';
import {
  CreateSpaceCommand,
  CreateSpaceResponse,
} from '../contracts/ICreateSpaceUseCase';
import {
  GetDefaultSpaceCommand,
  GetDefaultSpaceResponse,
} from '../contracts/IGetDefaultSpace';
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
}
