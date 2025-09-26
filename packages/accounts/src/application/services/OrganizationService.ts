import { v4 as uuidv4 } from 'uuid';
import slug from 'slug';
import {
  createOrganizationId,
  Organization,
  OrganizationId,
} from '../../domain/entities/Organization';
import { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository';
import { PackmindLogger } from '@packmind/shared';
import { OrganizationSlugConflictError } from '../../domain/errors';

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
      // Generate slug from name and check if it conflicts with existing organizations
      this.logger.debug('Generating slug from organization name', { name });
      const baseSlug = slug(name);
      const existingOrganization =
        await this.organizationRepository.findBySlug(baseSlug);

      if (existingOrganization) {
        throw new OrganizationSlugConflictError(name);
      }

      // Create the organization
      const organization: Organization = {
        id: createOrganizationId(uuidv4()),
        name,
        slug: baseSlug,
      };

      const createdOrganization =
        await this.organizationRepository.add(organization);
      this.logger.info('Organization created successfully', {
        organizationId: createdOrganization.id,
        name,
        slug: baseSlug,
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
    this.logger.info('Getting organization by name (will slugify internally)', {
      name,
    });
    // Convert name to slug and search by slug
    const organizationSlug = slug(name);
    this.logger.debug('Slugified name for search', {
      originalName: name,
      slug: organizationSlug,
    });
    return await this.organizationRepository.findBySlug(organizationSlug);
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    this.logger.info('Getting organization by slug', { slug });
    return await this.organizationRepository.findBySlug(slug);
  }

  async listOrganizations(): Promise<Organization[]> {
    this.logger.info('Listing all organizations');
    return await this.organizationRepository.list();
  }
}
