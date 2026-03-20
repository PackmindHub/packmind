import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Post,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { OrganizationId, Space } from '@packmind/types';
import { SpaceSlugConflictError } from '@packmind/spaces';
import { SpacesManagementService } from './spaces-management.service';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';

const origin = 'SpacesManagementController';

@Controller()
@UseGuards(OrganizationAccessGuard)
export class SpacesManagementController {
  constructor(
    private readonly spacesManagementService: SpacesManagementService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('SpacesManagementController initialized');
  }

  /**
   * Create a new space within an organization
   * POST /organizations/:orgId/spaces-management
   */
  @Post()
  async createSpace(
    @Param('orgId') organizationId: OrganizationId,
    @Body() body: { name: string },
    @Req() request: AuthenticatedRequest,
  ): Promise<Space> {
    const userId = request.user.userId;
    const name = body.name?.trim();

    if (!name) {
      throw new BadRequestException('Space name is required');
    }

    this.logger.info(
      'POST /organizations/:orgId/spaces-management - Creating space',
      {
        organizationId,
        userId,
      },
    );

    try {
      return await this.spacesManagementService.createSpace({
        name,
        organizationId,
        userId,
      });
    } catch (error) {
      if (error instanceof SpaceSlugConflictError) {
        this.logger.warn(
          'POST /organizations/:orgId/spaces-management - Space slug conflict',
          {
            organizationId,
            userId,
          },
        );
        throw new ConflictException(error.message);
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/spaces-management - Failed to create space',
        {
          organizationId,
          userId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
