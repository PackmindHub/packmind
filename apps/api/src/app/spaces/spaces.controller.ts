import { Controller, Get, Param, Req } from '@nestjs/common';
import { SpacesService } from './spaces.service';
import { PackmindLogger } from '@packmind/shared';
import { AuthenticatedRequest } from '@packmind/shared-nest';
import { Space } from '@packmind/shared/types';

@Controller('spaces')
export class SpacesController {
  constructor(
    private readonly spacesService: SpacesService,
    private readonly logger: PackmindLogger,
  ) {
    this.logger.info('SpacesController initialized');
  }

  @Get()
  async listSpaces(@Req() request: AuthenticatedRequest): Promise<Space[]> {
    const organizationId = request.organization.id;
    this.logger.info('GET /spaces - Listing spaces for organization', {
      organizationId,
    });

    return this.spacesService.listSpacesByOrganization(organizationId);
  }

  @Get(':slug')
  async getSpaceBySlug(
    @Param('slug') slug: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Space> {
    const organizationId = request.organization.id;
    this.logger.info('GET /spaces/:slug - Getting space by slug', {
      slug,
      organizationId,
    });

    return this.spacesService.getSpaceBySlug(slug, organizationId);
  }
}
