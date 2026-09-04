import { Injectable, NotFoundException } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import {
  ISpacesPort,
  ListUserSpacesResponse,
  OrganizationId,
  UserId,
} from '@packmind/types';
import { InjectSpacesAdapter } from '../shared/HexaInjection';

@Injectable()
export class SpacesService {
  constructor(
    @InjectSpacesAdapter() private readonly spacesAdapter: ISpacesPort,
    private readonly logger: PackmindLogger,
  ) {}

  async listUserSpaces(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<ListUserSpacesResponse> {
    this.logger.info('Listing user spaces', { organizationId });
    return this.spacesAdapter.listUserSpaces({ userId, organizationId });
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
}
