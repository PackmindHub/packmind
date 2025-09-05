import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  Organization,
  OrganizationId,
  OrganizationNameConflictError,
} from '@packmind/accounts';
import { OrganizationsService } from './organizations.service';
import { PackmindLogger } from '@packmind/shared';
import { Public } from '../../auth/auth.guard';

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
  async getOrganizations(): Promise<Organization[]> {
    this.logger.info('GET /organizations - Fetching all organizations');

    try {
      return await this.organizationsService.getOrganizations();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('GET /organizations - Failed to fetch organizations', {
        error: errorMessage,
      });
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
      'GET /organizations/by-name/:name - Fetching organization by name',
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

  @Public()
  @Post()
  async createOrganization(
    @Body() body: { name: string },
  ): Promise<Organization> {
    this.logger.info('POST /organizations - Creating new organization', {
      organizationName: body.name,
    });

    try {
      if (!body.name || body.name.trim() === '') {
        throw new BadRequestException('Organization name is required');
      }

      return await this.organizationsService.createOrganization(
        body.name.trim(),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('POST /organizations - Failed to create organization', {
        organizationName: body.name,
        error: errorMessage,
      });

      if (error instanceof OrganizationNameConflictError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }
}
