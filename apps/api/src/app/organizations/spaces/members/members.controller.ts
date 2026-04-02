import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { OrganizationId, SpaceId, UserId } from '@packmind/types';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  SpaceAdminRequiredError,
  CannotRemoveFromDefaultSpaceError,
  CannotRemoveSelfError,
} from '@packmind/spaces';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { SpaceMembersService } from './members.service';

@Controller()
@UseGuards(OrganizationAccessGuard)
export class SpaceMembersController {
  constructor(
    private readonly membersService: SpaceMembersService,
    private readonly logger: PackmindLogger,
  ) {}

  @Get()
  async listMembers(
    @Param('orgId') orgId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Request() req: AuthenticatedRequest,
  ) {
    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/members - Listing space members',
      { organizationId: orgId, spaceId },
    );

    return this.membersService.listSpaceMembers({
      userId: req.user.userId,
      organizationId: orgId,
      spaceId,
    });
  }

  @Post()
  async addMembers(
    @Param('orgId') orgId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body() body: { members: Array<{ userId: string; role: string }> },
    @Request() req: AuthenticatedRequest,
  ) {
    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/members - Adding members to space',
      {
        organizationId: orgId,
        spaceId,
        memberCount: body.members?.length ?? 0,
      },
    );

    try {
      return await this.membersService.addMembersToSpace({
        userId: req.user.userId,
        organizationId: orgId,
        spaceId,
        members: body.members,
      });
    } catch (error) {
      if (error instanceof SpaceAdminRequiredError) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }

  @Delete(':targetUserId')
  async removeMember(
    @Param('orgId') orgId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('targetUserId') targetUserId: UserId,
    @Request() req: AuthenticatedRequest,
  ) {
    this.logger.info(
      'DELETE /organizations/:orgId/spaces/:spaceId/members/:targetUserId - Removing member from space',
      { organizationId: orgId, spaceId, targetUserId },
    );

    try {
      return await this.membersService.removeMemberFromSpace({
        userId: req.user.userId,
        organizationId: orgId,
        spaceId,
        targetUserId,
      });
    } catch (error) {
      if (error instanceof SpaceAdminRequiredError) {
        throw new ForbiddenException(error.message);
      }
      if (error instanceof CannotRemoveFromDefaultSpaceError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof CannotRemoveSelfError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
