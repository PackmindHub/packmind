import {
  Controller,
  Get,
  Param,
  Req,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';

import { OrganizationId, UserId, UserOrganizationRole } from '@packmind/types';
import {
  ListOrganizationUserStatusesResponse,
  ListOrganizationUsersResponse,
  ChangeUserRoleResponse,
  ListOrganizationUserStatusesCommand,
  ListOrganizationUsersCommand,
  ChangeUserRoleCommand,
  CreateInvitationsCommand,
  CreateInvitationsResponse,
  RemoveUserFromOrganizationCommand,
  RemoveUserFromOrganizationResponse,
} from '@packmind/accounts';
import { UsersService } from './users.service';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';

const origin = 'OrganizationsUsersController';

@Controller()
@UseGuards(OrganizationAccessGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('OrganizationsUsersController initialized');
  }

  @Get('statuses')
  async getUserStatuses(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListOrganizationUserStatusesResponse> {
    this.logger.info(
      'GET /organizations/:orgId/users/statuses - Fetching user statuses for organization',
      {
        organizationId,
      },
    );

    try {
      const command: ListOrganizationUserStatusesCommand = {
        userId: request.user.userId,
        organizationId,
      };
      const response = await this.usersService.getUserStatuses(command);
      this.logger.info(
        'GET /organizations/:orgId/users/statuses - User statuses fetched successfully',
        {
          userCount: response.userStatuses.length,
          organizationId,
        },
      );
      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/users/statuses - Failed to fetch user statuses',
        {
          error: errorMessage,
          organizationId,
        },
      );
      throw error;
    }
  }

  @Get()
  async getOrganizationUsers(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListOrganizationUsersResponse> {
    this.logger.info(
      'GET /organizations/:orgId/users - Fetching users for organization',
      {
        organizationId,
      },
    );

    try {
      const command: ListOrganizationUsersCommand = {
        userId: request.user.userId,
        organizationId,
      };
      const response = await this.usersService.getOrganizationUsers(command);

      this.logger.info(
        'GET /organizations/:orgId/users - Users fetched successfully',
        {
          userCount: response.users.length,
          organizationId,
        },
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/users - Failed to fetch users',
        {
          error: errorMessage,
          organizationId,
        },
      );
      throw error;
    }
  }

  @Patch(':userId/role')
  async changeUserRole(
    @Param('orgId') organizationId: OrganizationId,
    @Param('userId') targetUserId: UserId,
    @Body('newRole') newRole: UserOrganizationRole,
    @Req() request: AuthenticatedRequest,
  ): Promise<ChangeUserRoleResponse> {
    this.logger.info(
      'PATCH /organizations/:orgId/users/:userId/role - Changing user role',
      {
        targetUserId,
        newRole,
        requesterId: request.user.userId,
        organizationId,
      },
    );

    try {
      const command: ChangeUserRoleCommand = {
        userId: request.user.userId,
        organizationId,
        targetUserId,
        newRole,
      };
      const response = await this.usersService.changeUserRole(command);

      this.logger.info(
        'PATCH /organizations/:orgId/users/:userId/role - User role changed successfully',
        {
          targetUserId,
          newRole,
          requesterId: request.user.userId,
          organizationId,
        },
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'PATCH /organizations/:orgId/users/:userId/role - Failed to change user role',
        {
          targetUserId,
          newRole,
          requesterId: request.user.userId,
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Post('invite')
  async inviteUsers(
    @Param('orgId') organizationId: OrganizationId,
    @Body() body: { emails: string[]; role: UserOrganizationRole },
    @Req() request: AuthenticatedRequest,
  ): Promise<CreateInvitationsResponse> {
    this.logger.info(
      'POST /organizations/:orgId/users/invite - Inviting users',
      {
        organizationId,
        requesterId: request.user.userId,
        emailCount: Array.isArray(body?.emails) ? body.emails.length : 0,
      },
    );

    try {
      if (!Array.isArray(body?.emails)) {
        throw new BadRequestException('emails must be an array of strings');
      }

      const command: CreateInvitationsCommand = {
        userId: request.user.userId,
        organizationId,
        emails: body.emails,
        role: body.role,
      };
      const response = await this.usersService.createInvitations(command);

      this.logger.info(
        'POST /organizations/:orgId/users/invite - Users invited successfully',
        {
          organizationId,
          requesterId: request.user.userId,
          createdCount: response.created.length,
          skippedCount: response.skipped.length,
        },
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/users/invite - Failed to invite users',
        {
          organizationId,
          requesterId: request.user.userId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Delete(':userId')
  async removeUser(
    @Param('orgId') organizationId: OrganizationId,
    @Param('userId') targetUserId: UserId,
    @Req() request: AuthenticatedRequest,
  ): Promise<RemoveUserFromOrganizationResponse> {
    this.logger.info(
      'DELETE /organizations/:orgId/users/:userId - Removing user from organization',
      {
        organizationId,
        targetUserId,
        requesterId: request.user.userId,
      },
    );

    try {
      const command: RemoveUserFromOrganizationCommand = {
        userId: request.user.userId,
        organizationId,
        targetUserId,
      };
      const response =
        await this.usersService.removeUserFromOrganization(command);

      this.logger.info(
        'DELETE /organizations/:orgId/users/:userId - User removed successfully',
        {
          organizationId,
          targetUserId,
          requesterId: request.user.userId,
          removed: response.removed,
        },
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'DELETE /organizations/:orgId/users/:userId - Failed to remove user',
        {
          organizationId,
          targetUserId,
          requesterId: request.user.userId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
