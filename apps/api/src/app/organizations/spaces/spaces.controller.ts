import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PackmindLogger, LogLevel } from '@packmind/shared';
import { SpaceId } from '@packmind/spaces';
import { OrganizationId } from '@packmind/accounts';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';
import { SpaceAccessGuard } from './guards/space-access.guard';

const origin = 'OrganizationsSpacesController';

/**
 * Controller for organization-scoped space routes
 * Actual path: /organizations/:orgId/spaces/:spaceId (inherited via RouterModule in AppModule)
 *
 * This controller serves as the entry point for space-scoped resources within an organization.
 * The path is configured in AppModule via RouterModule.
 * Nested modules (recipes, standards, etc.) are mounted as children in the RouterModule config.
 */
@Controller()
@UseGuards(OrganizationAccessGuard, SpaceAccessGuard)
export class OrganizationsSpacesController {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('OrganizationsSpacesController initialized');
  }

  /**
   * Health check endpoint for space-scoped routing
   * GET /organizations/:orgId/spaces/:spaceId
   */
  @Get()
  async getSpaceInfo(
    @Param('orgId') orgId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
  ): Promise<{
    message: string;
    organizationId: OrganizationId;
    spaceId: SpaceId;
  }> {
    this.logger.info('GET /organizations/:orgId/spaces/:spaceId - Space info', {
      organizationId: orgId,
      spaceId,
    });

    return {
      message: 'Space routing active',
      organizationId: orgId,
      spaceId,
    };
  }
}
