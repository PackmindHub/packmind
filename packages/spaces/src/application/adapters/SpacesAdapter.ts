import { OrganizationId } from '@packmind/types';
import { ISpacesPort } from '@packmind/types';
import { Space, SpaceId } from '@packmind/types';
import type { SpacesHexa } from '../../SpacesHexa';

/**
 * SpacesAdapter - Implements the ISpacesPort interface for cross-domain access
 * Following the Port/Adapter pattern from DDD monorepo architecture standard
 */
export class SpacesAdapter implements ISpacesPort {
  constructor(private readonly hexa: SpacesHexa) {}

  async createSpace(
    name: string,
    organizationId: OrganizationId,
  ): Promise<Space> {
    const spaceService = this.hexa.getSpaceService();
    return spaceService.createSpace(name, organizationId);
  }

  async listSpacesByOrganization(
    organizationId: OrganizationId,
  ): Promise<Space[]> {
    const spaceService = this.hexa.getSpaceService();
    return spaceService.listSpacesByOrganization(organizationId);
  }

  async getSpaceBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Space | null> {
    const spaceService = this.hexa.getSpaceService();
    return spaceService.getSpaceBySlug(slug, organizationId);
  }

  async getSpaceById(spaceId: SpaceId): Promise<Space | null> {
    const spaceService = this.hexa.getSpaceService();
    return spaceService.getSpaceById(spaceId);
  }
}
