import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { Space } from '@packmind/spaces';
import { OrganizationId } from '@packmind/types';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';
import { SpacesService } from '../../spaces/spaces.service';

const origin = 'OrganizationsSpacesController';

/**
 * Controller for organization-scoped space routes
 * Actual path: /organizations/:orgId/spaces (inherited via RouterModule in AppModule)
 *
 * This controller provides endpoints for managing spaces within an organization.
 * The path is configured in AppModule via RouterModule.
 * Nested modules (recipes, standards, etc.) are mounted as children in the RouterModule config.
 */
@Controller()
export class OrganizationsSpacesController {
  constructor(
    private readonly spacesService: SpacesService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('OrganizationsSpacesController initialized');
  }

  /**
   * Get all spaces for an organization
   * GET /organizations/:orgId/spaces
   */
  @Get()
  @UseGuards(OrganizationAccessGuard)
  async listSpaces(@Param('orgId') orgId: OrganizationId): Promise<Space[]> {
    this.logger.info('GET /organizations/:orgId/spaces - Listing spaces', {
      organizationId: orgId,
    });

    return this.spacesService.listSpacesByOrganization(orgId);
  }

  /**
   * Get a space by slug within an organization
   * GET /organizations/:orgId/spaces/:slug
   */
  @Get(':slug')
  @UseGuards(OrganizationAccessGuard)
  async getSpaceBySlug(
    @Param('orgId') orgId: OrganizationId,
    @Param('slug') slug: string,
  ): Promise<Space> {
    this.logger.info(
      'GET /organizations/:orgId/spaces/:slug - Getting space by slug',
      {
        organizationId: orgId,
        slug,
      },
    );

    return this.spacesService.getSpaceBySlug(slug, orgId);
  }
}
