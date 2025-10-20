import { Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationId } from '@packmind/shared/types';
import { PackmindLogger } from '@packmind/shared';
import { SpacesHexa } from '@packmind/spaces';

@Injectable()
export class SpacesService {
  constructor(
    private readonly spacesHexa: SpacesHexa,
    private readonly logger: PackmindLogger,
  ) {}

  async listSpacesByOrganization(organizationId: OrganizationId) {
    this.logger.info('Listing spaces by organization', { organizationId });
    const spacesAdapter = this.spacesHexa.getSpacesAdapter();
    return spacesAdapter.listSpacesByOrganization(organizationId);
  }

  async getSpaceBySlug(slug: string, organizationId: OrganizationId) {
    this.logger.info('Getting space by slug', { slug, organizationId });
    const spacesAdapter = this.spacesHexa.getSpacesAdapter();
    const space = await spacesAdapter.getSpaceBySlug(slug, organizationId);

    if (!space) {
      throw new NotFoundException(
        `Space with slug '${slug}' not found in organization`,
      );
    }

    return space;
  }
}
