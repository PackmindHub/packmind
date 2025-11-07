import { Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationId, ISpacesPort } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { SpaceId } from '@packmind/spaces';
import { InjectSpacesAdapter } from '../shared/HexaInjection';

@Injectable()
export class SpacesService {
  constructor(
    @InjectSpacesAdapter() private readonly spacesAdapter: ISpacesPort,
    private readonly logger: PackmindLogger,
  ) {}

  async listSpacesByOrganization(organizationId: OrganizationId) {
    this.logger.info('Listing spaces by organization', { organizationId });
    return this.spacesAdapter.listSpacesByOrganization(organizationId);
  }

  async getSpaceBySlug(slug: string, organizationId: OrganizationId) {
    this.logger.info('Getting space by slug', { slug, organizationId });
    const space = await this.spacesAdapter.getSpaceBySlug(slug, organizationId);

    if (!space) {
      throw new NotFoundException(
        `Space with slug '${slug}' not found in organization`,
      );
    }

    return space;
  }

  async getSpaceById(spaceId: SpaceId) {
    this.logger.info('Getting space by ID', { spaceId });
    const space = await this.spacesAdapter.getSpaceById(spaceId);

    if (!space) {
      throw new NotFoundException(`Space with ID '${spaceId}' not found`);
    }

    return space;
  }
}
