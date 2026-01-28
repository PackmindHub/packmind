import {
  Controller,
  Get,
  Post,
  Patch,
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
  RenameOrganizationResponse,
} from '@packmind/types';
import {
  OrganizationSlugConflictError,
  InvalidOrganizationNameError,
} from '@packmind/accounts';
import { OrganizationsService } from './organizations.service';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { Public } from '@packmind/node-utils';

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

  @Patch(':orgId/name')
  async renameOrganization(
    @Param('orgId') organizationId: OrganizationId,
    @Body() body: { name: string },
    @Req() request: AuthenticatedRequest,
  ): Promise<RenameOrganizationResponse> {
    this.logger.info(
      'PATCH /organizations/:orgId/name - Renaming organization',
      {
        organizationId,
      },
    );

    try {
      return await this.organizationsService.renameOrganization({
        organizationId,
        userId: request.user.userId,
        name: body.name,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'PATCH /organizations/:orgId/name - Failed to rename organization',
        {
          organizationId,
          error: errorMessage,
        },
      );

      if (error instanceof InvalidOrganizationNameError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof OrganizationSlugConflictError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }
}
