import { Controller, Get, NotFoundException, Param, Req } from '@nestjs/common';

import {
  ListOrganizationUserStatusesResponse,
  ListUsersResponse,
  User,
  UserId,
} from '@packmind/accounts';
import { UsersService } from './users.service';
import { PackmindLogger } from '@packmind/shared';
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

  @Get()
  async getUsers(
    @Req() request: AuthenticatedRequest,
  ): Promise<ListUsersResponse> {
    this.logger.info('GET /users - Fetching all users for organization', {
      organizationId: request.organization.id,
    });

    try {
      const response = await this.usersService.getUsers(
        request.user.userId,
        request.organization.id,
      );
      this.logger.info('GET /users - Users fetched successfully', {
        userCount: response.users.length,
        organizationId: request.organization.id,
      });
      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('GET /users - Failed to fetch users', {
        error: errorMessage,
      });
      throw error;
    }
  }

  @Get('organization')
  async getUsersInMyOrganization(
    @Req() request: AuthenticatedRequest,
  ): Promise<ListUsersResponse['users']> {
    this.logger.info(
      'GET /users/organization - Fetching users in current organization',
    );

    try {
      // Organization data is available in request from auth guard
      const organization = request.organization;

      const users = await this.usersService.getUsersByOrganizationId(
        request.user.userId,
        organization.id,
      );

      this.logger.info('GET /users/organization - Users fetched successfully', {
        organizationId: organization.id,
        organizationName: organization.name,
        userCount: users.length,
      });

      return users;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /users/organization - Failed to fetch organization users',
        {
          organizationId: request.organization.id,
          error: errorMessage,
        },
      );
      throw error;
    }
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
}
