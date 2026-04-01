import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { OrganizationId, SpaceId } from '@packmind/types';
import { AuthenticatedRequest } from '@packmind/node-utils';
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

    return this.membersService.addMembersToSpace({
      userId: req.user.userId,
      organizationId: orgId,
      spaceId,
      members: body.members,
    });
  }
}
