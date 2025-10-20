import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  Organization,
  OrganizationId,
  OrganizationSlugConflictError,
  OrganizationNotFoundError,
  InvitationBatchEmptyError,
  RemoveUserFromOrganizationResponse,
  UserId,
  RemoveUserFromOrganizationCommand,
} from '@packmind/accounts';
import { OrganizationsService } from './organizations.service';
import {
  PackmindLogger,
  UserOrganizationRole,
  UserNotFoundError,
} from '@packmind/shared';
import { AuthenticatedRequest } from '@packmind/shared-nest';
import { Public } from '@packmind/shared-nest';

const origin = 'OrganizationsController';

@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('OrganizationsController initialized');
  }

  @Get()
  async getUserOrganizations(
    @Req() request: AuthenticatedRequest,
  ): Promise<Organization[]> {
    const userId = request.user.userId;
    this.logger.info('GET /organizations - Fetching user organizations', {
      userId,
    });

    try {
      return await this.organizationsService.getUserOrganizations(userId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations - Failed to fetch user organizations',
        {
          userId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get(':id')
  async getOrganizationById(
    @Param('id') id: OrganizationId,
  ): Promise<Organization> {
    this.logger.info('GET /organizations/:id - Fetching organization by ID', {
      organizationId: id,
    });

    try {
      const organization =
        await this.organizationsService.getOrganizationById(id);
      if (!organization) {
        throw new NotFoundException(`Organization with ID ${id} not found`);
      }
      return organization;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:id - Failed to fetch organization',
        {
          organizationId: id,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Public()
  @Get('by-name/:name')
  async getOrganizationByName(
    @Param('name') name: string,
  ): Promise<Organization> {
    this.logger.info(
      'GET /organizations/by-name/:name - Fetching organization by name (will slugify internally)',
      {
        organizationName: name,
      },
    );

    try {
      const organization =
        await this.organizationsService.getOrganizationByName(name);
      if (!organization) {
        throw new NotFoundException(
          `Organization with name '${name}' not found`,
        );
      }
      return organization;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/by-name/:name - Failed to fetch organization',
        {
          organizationName: name,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Public()
  @Get('slug/:slug')
  async getOrganizationBySlug(
    @Param('slug') slug: string,
  ): Promise<Organization> {
    this.logger.info(
      'GET /organizations/slug/:slug - Fetching organization by slug',
      {
        organizationSlug: slug,
      },
    );

    try {
      const organization =
        await this.organizationsService.getOrganizationBySlug(slug);
      if (!organization) {
        throw new NotFoundException(
          `Organization with slug '${slug}' not found`,
        );
      }
      return organization;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/slug/:slug - Failed to fetch organization',
        {
          organizationSlug: slug,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Post()
  async createOrganization(
    @Body() body: { name: string },
    @Req() request: AuthenticatedRequest,
  ): Promise<Organization> {
    this.logger.info('POST /organizations - Creating new organization', {
      organizationName: body.name,
    });

    try {
      if (!body.name || body.name.trim() === '') {
        throw new BadRequestException('Organization name is required');
      }

      return await this.organizationsService.createOrganization(
        request.user.userId,
        body.name.trim(),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('POST /organizations - Failed to create organization', {
        organizationName: body.name,
        error: errorMessage,
      });

      if (error instanceof OrganizationSlugConflictError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  @Post(':orgId/invite')
  async inviteUsers(
    @Param('orgId') orgId: OrganizationId,
    @Body() body: { emails: string[]; role: UserOrganizationRole },
    @Req() request: AuthenticatedRequest,
  ) {
    const inviterId = request.user?.userId;
    this.logger.info('POST /organizations/:orgId/invite - Inviting users', {
      organizationId: orgId,
      inviterId,
      emailCount: Array.isArray(body?.emails) ? body.emails.length : 0,
    });

    try {
      if (!Array.isArray(body?.emails)) {
        throw new BadRequestException('emails must be an array of strings');
      }

      if (!inviterId) {
        throw new BadRequestException('User authentication required');
      }

      return await this.organizationsService.inviteUsers(
        orgId,
        inviterId,
        body.emails,
        body.role,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/invite - Failed to invite users',
        {
          organizationId: orgId,
          inviterId,
          error: errorMessage,
        },
      );

      if (error instanceof OrganizationNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof UserNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof InvitationBatchEmptyError) {
        throw new BadRequestException(error.message);
      }
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw error;
    }
  }

  @Delete(':organizationId/user/:userId')
  async removeUserFromOrganization(
    @Param('organizationId') organizationId: OrganizationId,
    @Param('userId') userId: UserId,
    @Req() request: AuthenticatedRequest,
  ): Promise<RemoveUserFromOrganizationResponse> {
    this.logger.info(
      'DELETE /organizations/:organizationId/user/:userId - Removing user from organization',
      {
        organizationId,
        targetUserId: userId,
        requestingUserId: request.user?.userId,
      },
    );

    const command: RemoveUserFromOrganizationCommand = {
      userId: request.user.userId,
      organizationId,
      targetUserId: userId,
    };

    return this.organizationsService.removeUserFromOrganization(command);
  }
}
