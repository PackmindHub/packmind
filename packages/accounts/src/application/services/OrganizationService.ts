import { v4 as uuidv4 } from 'uuid';
import slug from 'slug';
import {
  createOrganizationId,
  Organization,
  OrganizationId,
} from '../../domain/entities/Organization';
import { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository';
import { PackmindLogger } from '@packmind/shared';
import { OrganizationNameConflictError } from '../../domain/errors';

const origin = 'OrganizationService';

export class OrganizationService {
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('OrganizationService initialized');
  }

  async createOrganization(name: string): Promise<Organization> {
    this.logger.info('Creating organization', { name });

    try {
      // Generate slug from name
      this.logger.debug('Generating slug from organization name', { name });
      const organizationSlug = await this.getUniqueSlug(name);
      this.logger.debug('Slug generated', { slug: organizationSlug });

      // Check if organization name already exists
      const existingOrganization =
        await this.organizationRepository.findByName(name);
      if (existingOrganization) {
        throw new OrganizationNameConflictError(name);
      }

      // Create the organization
      const organization: Organization = {
        id: createOrganizationId(uuidv4()),
        name,
        slug: organizationSlug,
      };

      const createdOrganization =
        await this.organizationRepository.add(organization);
      this.logger.info('Organization created successfully', {
        organizationId: createdOrganization.id,
        name,
        slug: organizationSlug,
      });
      return createdOrganization;
    } catch (error) {
      this.logger.error('Failed to create organization', {
        name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getOrganizationById(id: OrganizationId): Promise<Organization | null> {
    this.logger.info('Getting organization by ID', { id });
    return await this.organizationRepository.findById(id);
  }

  async getOrganizationByName(name: string): Promise<Organization | null> {
    this.logger.info('Getting organization by name', { name });
    return await this.organizationRepository.findByName(name);
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    this.logger.info('Getting organization by slug', { slug });
    return await this.organizationRepository.findBySlug(slug);
  }

  async listOrganizations(): Promise<Organization[]> {
    this.logger.info('Listing all organizations');
    return await this.organizationRepository.list();
  }

  private async getUniqueSlug(
    organizationName: string,
    index = 0,
  ): Promise<string> {
    const organizationSlug = `${slug(organizationName)}${index > 0 ? `-${index}` : ''}`;
    const existingSlugOrganization =
      await this.organizationRepository.findBySlug(organizationSlug);
    if (existingSlugOrganization) {
      return this.getUniqueSlug(organizationName, index + 1);
    }

    return organizationSlug;
  }
}
