import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';

import { User, UserId } from '@packmind/accounts';
import { UsersService } from './users.service';
import { PackmindLogger } from '@packmind/shared';
import { AuthService } from '../../auth/auth.service';
import { Public } from '../../auth/auth.guard';
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
  async getUsers(): Promise<User[]> {
    this.logger.info('GET /users - Fetching all users');

    try {
      return await this.usersService.getUsers();
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
  ): Promise<User[]> {
    this.logger.info(
      'GET /users/organization - Fetching users in current organization',
    );

    try {
      // Organization data is available in request from auth guard
      const organization = request.organization;

      const users = await this.usersService.getUsersByOrganizationId(
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

  @Get('by-username/:username')
  async getUserByUsername(@Param('username') username: string): Promise<User> {
    this.logger.info(
      'GET /users/by-username/:username - Fetching user by username',
      {
        username: username,
      },
    );

    try {
      const user = await this.usersService.getUserByUsername(username);
      if (!user) {
        throw new NotFoundException(
          `User with username '${username}' not found`,
        );
      }
      return user;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /users/by-username/:username - Failed to fetch user',
        {
          username: username,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Public()
  @Post('does-username-exist')
  @HttpCode(HttpStatus.OK)
  async doesUsernameExist(@Body() body: { username: string }): Promise<{
    exists: boolean;
  }> {
    this.logger.info(
      'POST /users/does-username-exist - Checking username availability',
      {
        username: body.username,
      },
    );

    try {
      const exists = await this.usersService.doesUsernameExist(body.username);

      this.logger.info(
        'POST /users/does-username-exist - Username check completed',
        {
          username: body.username,
          exists,
        },
      );

      return { exists };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /users/does-username-exist - Failed to check username',
        {
          username: body.username,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
