import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  ListPackagesBySpaceResponse,
  OrganizationId,
  SpaceId,
} from '@packmind/types';
import { DeploymentsService } from '../../../deployments/deployments.service';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../guards/space-access.guard';

const origin = 'OrganizationsSpacesPackagesController';

/**
 * Controller for space-scoped package routes within organizations
 * Actual path: /organizations/:orgId/spaces/:spaceId/packages (inherited via RouterModule in AppModule)
 *
 * This controller provides space-scoped package endpoints within organizations.
 * The path is inherited from the RouterModule configuration in AppModule:
 * - Parent: /organizations/:orgId/spaces/:spaceId (from OrganizationsSpacesModule)
 * - This controller: (empty, inherits from /packages path in RouterModule)
 * - Final path: /organizations/:orgId/spaces/:spaceId/packages
 *
 * Both OrganizationAccessGuard and SpaceAccessGuard ensure proper access control.
 */
@Controller()
@UseGuards(OrganizationAccessGuard, SpaceAccessGuard)
export class OrganizationsSpacesPackagesController {
  constructor(
    private readonly deploymentsService: DeploymentsService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('OrganizationsSpacesPackagesController initialized');
  }

  /**
   * Get all packages for a space within an organization
   * GET /organizations/:orgId/spaces/:spaceId/packages
   */
  @Get()
  async getPackages(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListPackagesBySpaceResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/packages - Fetching packages',
      {
        organizationId,
        spaceId,
      },
    );

    try {
      return await this.deploymentsService.listPackagesBySpace({
        userId,
        organizationId,
        spaceId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/packages - Failed to fetch packages',
        {
          organizationId,
          spaceId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
