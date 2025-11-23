import {
  Controller,
  Get,
  Param,
  Req,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';

import { OrganizationId, UserId, UserOrganizationRole } from '@packmind/types';
import {
  ListOrganizationUserStatusesResponse,
  ListOrganizationUsersResponse,
  ChangeUserRoleResponse,
  ListOrganizationUserStatusesCommand,
  ListOrganizationUsersCommand,
  ChangeUserRoleCommand,
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
}
