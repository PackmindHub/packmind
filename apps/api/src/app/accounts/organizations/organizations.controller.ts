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
} from '@nestjs/common';
import {
  Organization,
  OrganizationId,
  RenameOrganizationResponse,
} from '@packmind/types';
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

    return this.organizationsService.getUserOrganizations(userId);
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

    const organization =
      await this.organizationsService.getOrganizationByName(name);
    if (!organization) {
      throw new NotFoundException(`Organization with name '${name}' not found`);
    }
    return organization;
  }

  @Post()
  async createOrganization(
    @Body() body: { name: string },
    @Req() request: AuthenticatedRequest,
  ): Promise<Organization> {
    this.logger.info('POST /organizations - Creating new organization', {
      organizationName: body.name,
    });

    if (!body.name || body.name.trim() === '') {
      throw new BadRequestException('Organization name is required');
    }

    return this.organizationsService.createOrganization(
      request.user.userId,
      body.name.trim(),
    );
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

    return this.organizationsService.renameOrganization({
      organizationId,
      userId: request.user.userId,
      name: body.name,
    });
  }
}
