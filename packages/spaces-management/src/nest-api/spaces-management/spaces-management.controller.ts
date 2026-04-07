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
import {
  MoveArtifactsToSpaceResponse,
  OrganizationId,
  PackmindCommandBody,
  MoveArtifactsToSpaceCommand,
  Space,
  SpaceType,
} from '@packmind/types';
import { SpaceSlugConflictError } from '@packmind/spaces';
import { ArtifactNameConflictError } from '../../domain/errors/ArtifactNameConflictError';
import { SpacesManagementService } from './spaces-management.service';
import { OrganizationAccessGuard } from '../shared/organization-access.guard';

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
    @Body() body: { name: string; type?: SpaceType },
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
        type: body.type,
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

  /**
   * Move artifacts between spaces
   * POST /organizations/:orgId/spaces-management/move
   */
  @Post('move')
  async moveArtifactsToSpace(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
    @Body() body: PackmindCommandBody<MoveArtifactsToSpaceCommand>,
  ): Promise<MoveArtifactsToSpaceResponse> {
    const userId = request.user.userId;

    if (!body.sourceSpaceId || !body.destinationSpaceId) {
      throw new BadRequestException(
        'sourceSpaceId and destinationSpaceId are required',
      );
    }

    if (!body.artifacts?.length) {
      throw new BadRequestException('artifacts must not be empty');
    }

    this.logger.info(
      'POST /organizations/:orgId/spaces-management/move - Moving artifacts',
      {
        organizationId,
        userId,
        sourceSpaceId: body.sourceSpaceId,
        destinationSpaceId: body.destinationSpaceId,
      },
    );

    try {
      return await this.spacesManagementService.moveArtifactsToSpace({
        userId,
        organizationId,
        ...body,
      });
    } catch (error) {
      if (error instanceof ArtifactNameConflictError) {
        throw new ConflictException(error.message);
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/spaces-management/move - Failed to move artifacts',
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
