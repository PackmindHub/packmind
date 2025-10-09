import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Req,
  Patch,
  Body,
} from '@nestjs/common';

import {
  ListOrganizationUserStatusesResponse,
  ListOrganizationUsersResponse,
  User,
  UserId,
} from '@packmind/accounts';
import { UsersService } from './users.service';
import {
  PackmindLogger,
  ChangeUserRoleResponse,
  UserOrganizationRole,
} from '@packmind/shared';
import { AuthService } from '../../auth/auth.service';
import { AuthenticatedRequest } from '@packmind/shared-nest';

const origin = 'UsersController';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('UsersController initialized');
  }

  @Get('statuses')
  async getUserStatuses(
    @Req() request: AuthenticatedRequest,
  ): Promise<ListOrganizationUserStatusesResponse> {
    this.logger.info(
      'GET /users/statuses - Fetching user statuses for organization',
      {
        organizationId: request.organization.id,
      },
    );

    try {
      const response = await this.usersService.getUserStatuses(
        request.user.userId,
        request.organization.id,
      );
      this.logger.info(
        'GET /users/statuses - User statuses fetched successfully',
        {
          userCount: response.userStatuses.length,
          organizationId: request.organization.id,
        },
      );
      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('GET /users/statuses - Failed to fetch user statuses', {
        error: errorMessage,
        organizationId: request.organization.id,
      });
      throw error;
    }
  }

  @Get('organization')
  async getOrganizationUsers(
    @Req() request: AuthenticatedRequest,
  ): Promise<ListOrganizationUsersResponse> {
    this.logger.info(
      'GET /users/organization - Fetching users for organization',
      {
        organizationId: request.organization.id,
      },
    );

    try {
      const response = await this.usersService.getOrganizationUsers(
        request.user.userId,
        request.organization.id,
      );

      this.logger.info('GET /users/organization - Users fetched successfully', {
        userCount: response.users.length,
        organizationId: request.organization.id,
      });

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('GET /users/organization - Failed to fetch users', {
        error: errorMessage,
        organizationId: request.organization.id,
      });
      throw error;
    }
  }

  @Get(':id')
  async getUserById(@Param('id') id: UserId): Promise<User> {
    this.logger.info('GET /users/:id - Fetching user by ID', {
      userId: id,
    });

    try {
      const user = await this.usersService.getUserById(id);
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      return user;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('GET /users/:id - Failed to fetch user', {
        userId: id,
        error: errorMessage,
      });
      throw error;
    }
  }

  @Patch(':id/role')
  async changeUserRole(
    @Param('id') targetUserId: UserId,
    @Body('newRole') newRole: UserOrganizationRole,
    @Req() request: AuthenticatedRequest,
  ): Promise<ChangeUserRoleResponse> {
    this.logger.info('PATCH /users/:id/role - Changing user role', {
      targetUserId,
      newRole,
      requesterId: request.user.userId,
      organizationId: request.organization.id,
    });

    try {
      const response = await this.usersService.changeUserRole(
        request.user.userId,
        request.organization.id,
        targetUserId,
        newRole,
      );

      this.logger.info(
        'PATCH /users/:id/role - User role changed successfully',
        {
          targetUserId,
          newRole,
          requesterId: request.user.userId,
          organizationId: request.organization.id,
        },
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('PATCH /users/:id/role - Failed to change user role', {
        targetUserId,
        newRole,
        requesterId: request.user.userId,
        organizationId: request.organization.id,
        error: errorMessage,
      });
      throw error;
    }
  }
}
