import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Patch,
  Post,
  Param,
  Req,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  AuthenticatedRequest,
  SpaceMembershipRequiredError,
} from '@packmind/node-utils';
import {
  ArtifactType,
  MoveArtifactsToSpaceResponse,
  OrganizationId,
  PackmindCommandBody,
  MoveArtifactsToSpaceCommand,
  Space,
  SpaceType,
  BrowseSpacesResponse,
  SpaceId,
} from '@packmind/types';
import { SpaceSlugConflictError } from '@packmind/spaces';
import { OrganizationAdminRequiredError } from '@packmind/node-utils';
import { ArtifactNameConflictError } from '../../domain/errors/ArtifactNameConflictError';
import { ArtifactNotInSourceSpaceError } from '../../domain/errors/ArtifactNotInSourceSpaceError';
import { ArtifactSlugConflictError } from '../../domain/errors/ArtifactSlugConflictError';
import { CannotLeaveDefaultSpaceError } from '../../domain/errors/CannotLeaveDefaultSpaceError';
import { CannotDeleteDefaultSpaceError } from '../../domain/errors/CannotDeleteDefaultSpaceError';
import { CannotPinDefaultSpaceError } from '../../domain/errors/CannotPinDefaultSpaceError';
import { SpaceDeletionForbiddenError } from '../../domain/errors/SpaceDeletionForbiddenError';
import { SpaceNotJoinableError } from '../../domain/errors/SpaceNotJoinableError';
import { SpaceNotFoundError } from '../../domain/errors/SpaceNotFoundError';
import { SpaceOwnershipMismatchError } from '../../domain/errors/SpaceOwnershipMismatchError';
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
      if (error instanceof OrganizationAdminRequiredError) {
        throw new ForbiddenException(error.message);
      }
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
   * Browse spaces in the organization
   * GET /organizations/:orgId/spaces-management/browse
   */
  @Get('browse')
  async browseSpaces(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
  ): Promise<BrowseSpacesResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces-management/browse - Browsing spaces',
      { organizationId, userId },
    );

    return this.spacesManagementService.browseSpaces({
      userId,
      organizationId,
    });
  }

  /**
   * Self-join an open space
   * POST /organizations/:orgId/spaces-management/:spaceId/join
   */
  @Post(':spaceId/join')
  @HttpCode(204)
  async joinSpace(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/spaces-management/:spaceId/join - Joining space',
      { organizationId, userId, spaceId },
    );

    try {
      await this.spacesManagementService.joinSpace({
        userId,
        organizationId,
        spaceId,
      });
    } catch (error) {
      if (error instanceof SpaceNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof SpaceNotJoinableError) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }

  /**
   * Self-join a space by its slug
   * POST /organizations/:orgId/spaces-management/by-slug/:spaceSlug/join
   */
  @Post('by-slug/:spaceSlug/join')
  @HttpCode(204)
  async joinSpaceBySlug(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceSlug') spaceSlug: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/spaces-management/by-slug/:spaceSlug/join - Joining space by slug',
      { organizationId, userId, spaceSlug },
    );

    try {
      await this.spacesManagementService.joinSpaceBySlug({
        userId,
        organizationId,
        spaceSlug,
      });
    } catch (error) {
      if (error instanceof SpaceNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof SpaceNotJoinableError) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }

  /**
   * Leave a space (user-initiated self-removal)
   * POST /organizations/:orgId/spaces-management/:spaceId/leave
   */
  @Post(':spaceId/leave')
  @HttpCode(204)
  async leaveSpace(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/spaces-management/:spaceId/leave - Leaving space',
      { organizationId, spaceId },
    );

    try {
      await this.spacesManagementService.leaveSpace({
        userId,
        organizationId,
        spaceId,
      });
    } catch (error) {
      if (
        error instanceof SpaceNotFoundError ||
        error instanceof SpaceMembershipRequiredError
      ) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof CannotLeaveDefaultSpaceError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
  }

  /**
   * Update a space's settings
   * PATCH /organizations/:orgId/spaces-management/:spaceId
   */
  @Patch(':spaceId')
  async updateSpace(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body() body: { name?: string; type?: SpaceType },
    @Req() request: AuthenticatedRequest,
  ): Promise<Space> {
    const userId = request.user.userId;

    this.logger.info(
      'PATCH /organizations/:orgId/spaces-management/:spaceId - Updating space',
      { organizationId, userId, spaceId },
    );

    try {
      return await this.spacesManagementService.updateSpace({
        userId,
        organizationId,
        spaceId,
        name: body.name?.trim() || undefined,
        type: body.type,
      });
    } catch (error) {
      if (error instanceof SpaceNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof SpaceSlugConflictError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  /**
   * Delete a space
   * DELETE /organizations/:orgId/spaces-management/:spaceId
   */
  @Delete(':spaceId')
  @HttpCode(204)
  async deleteSpace(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.user.userId;

    this.logger.info(
      'DELETE /organizations/:orgId/spaces-management/:spaceId - Deleting space',
      { organizationId, userId, spaceId },
    );

    try {
      await this.spacesManagementService.deleteSpace({
        userId,
        organizationId,
        spaceId,
      });
    } catch (error) {
      if (error instanceof SpaceNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof CannotDeleteDefaultSpaceError) {
        throw new UnprocessableEntityException(error.message);
      }
      if (error instanceof SpaceDeletionForbiddenError) {
        throw new ForbiddenException(error.message);
      }
      if (error instanceof OrganizationAdminRequiredError) {
        throw new ForbiddenException(error.message);
      }
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

    const validTypes: ArtifactType[] = ['standard', 'skill', 'command'];
    const invalidArtifact = body.artifacts.find(
      (a) => !validTypes.includes(a.type),
    );
    if (invalidArtifact) {
      throw new BadRequestException(
        `Invalid artifact type: ${invalidArtifact.type}`,
      );
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
      if (error instanceof SpaceNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (
        error instanceof SpaceOwnershipMismatchError ||
        error instanceof SpaceMembershipRequiredError
      ) {
        throw new ForbiddenException(error.message);
      }
      if (error instanceof ArtifactNotInSourceSpaceError) {
        throw new UnprocessableEntityException(error.message);
      }
      if (
        error instanceof ArtifactNameConflictError ||
        error instanceof ArtifactSlugConflictError
      ) {
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

  /**
   * Pin a space for the current user
   * POST /organizations/:orgId/spaces-management/:spaceId/pin
   */
  @Post(':spaceId/pin')
  @HttpCode(204)
  async pinSpace(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/spaces-management/:spaceId/pin - Pinning space',
      { organizationId, userId, spaceId },
    );

    try {
      await this.spacesManagementService.pinSpace({
        userId,
        organizationId,
        spaceId,
      });
    } catch (error) {
      if (error instanceof CannotPinDefaultSpaceError) {
        throw new UnprocessableEntityException(error.message);
      }
      if (error instanceof SpaceMembershipRequiredError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof SpaceNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /**
   * Unpin a space for the current user
   * POST /organizations/:orgId/spaces-management/:spaceId/unpin
   */
  @Post(':spaceId/unpin')
  @HttpCode(204)
  async unpinSpace(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/spaces-management/:spaceId/unpin - Unpinning space',
      { organizationId, userId, spaceId },
    );

    try {
      await this.spacesManagementService.unpinSpace({
        userId,
        organizationId,
        spaceId,
      });
    } catch (error) {
      if (error instanceof CannotPinDefaultSpaceError) {
        throw new UnprocessableEntityException(error.message);
      }
      if (error instanceof SpaceMembershipRequiredError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof SpaceNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
