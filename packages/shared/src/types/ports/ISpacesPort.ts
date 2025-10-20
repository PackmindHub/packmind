import { OrganizationId } from '../accounts';
import { Space } from '../spaces';

/**
 * Port interface for cross-domain access to Spaces functionality
 * Following DDD monorepo architecture standard
 */
export interface ISpacesPort {
  /**
   * Create a space for an organization
   * This is called when a new organization is created (with name "Global")
   * or when users create additional spaces
   */
  createSpace(name: string, organizationId: OrganizationId): Promise<Space>;

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
}
