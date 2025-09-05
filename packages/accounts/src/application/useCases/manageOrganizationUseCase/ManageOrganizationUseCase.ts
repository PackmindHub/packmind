import {
  Organization,
  OrganizationId,
} from '../../../domain/entities/Organization';
import { OrganizationService } from '../../services/OrganizationService';
import { PackmindLogger } from '@packmind/shared';

export interface CreateOrganizationRequest {
  name: string;
}

const origin = 'ManageOrganizationUseCase';

export class ManageOrganizationUseCase {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('ManageOrganizationUseCase initialized');
  }

  async createOrganization(
    request: CreateOrganizationRequest,
  ): Promise<Organization> {
    const { name } = request;

    this.logger.info('Executing create organization use case', { name });

    if (!name || name.trim().length === 0) {
      const error = new Error('Organization name is required');
      this.logger.error('Failed to execute create organization use case', {
        name,
        error: error.message,
      });
      throw error;
    }

    try {
      const organization = await this.organizationService.createOrganization(
        name.trim(),
      );

      this.logger.info('Create organization use case executed successfully', {
        organizationId: organization.id,
        name,
      });
      return organization;
    } catch (error) {
      this.logger.error('Failed to execute create organization use case', {
        name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getOrganizationById(id: OrganizationId): Promise<Organization | null> {
    this.logger.info('Executing get organization by ID use case', { id });

    try {
      const organization =
        await this.organizationService.getOrganizationById(id);
      this.logger.info(
        'Get organization by ID use case executed successfully',
        {
          id,
          found: !!organization,
        },
      );
      return organization;
    } catch (error) {
      this.logger.error('Failed to execute get organization by ID use case', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getOrganizationByName(name: string): Promise<Organization | null> {
    this.logger.info('Executing get organization by name use case', { name });

    try {
      const organization =
        await this.organizationService.getOrganizationByName(name);
      this.logger.info(
        'Get organization by name use case executed successfully',
        {
          name,
          found: !!organization,
        },
      );
      return organization;
    } catch (error) {
      this.logger.error('Failed to execute get organization by name use case', {
        name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    this.logger.info('Executing get organization by slug use case', { slug });

    try {
      const organization =
        await this.organizationService.getOrganizationBySlug(slug);
      this.logger.info(
        'Get organization by slug use case executed successfully',
        {
          slug,
          found: !!organization,
        },
      );
      return organization;
    } catch (error) {
      this.logger.error('Failed to execute get organization by slug use case', {
        slug,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listOrganizations(): Promise<Organization[]> {
    this.logger.info('Executing list organizations use case');

    try {
      const organizations = await this.organizationService.listOrganizations();
      this.logger.info('List organizations use case executed successfully', {
        count: organizations.length,
      });
      return organizations;
    } catch (error) {
      this.logger.error('Failed to execute list organizations use case', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
