import { Repository } from 'typeorm';
import { Organization } from '@packmind/types';
import { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository';
import { OrganizationSchema } from '../schemas/OrganizationSchema';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/shared';

const origin = 'OrganizationRepository';

export class OrganizationRepository
  extends AbstractRepository<Organization>
  implements IOrganizationRepository
{
  constructor(
    repository: Repository<Organization> = localDataSource.getRepository<Organization>(
      OrganizationSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('organization', repository, logger, OrganizationSchema);
    this.logger.info('OrganizationRepository initialized');
  }

  protected override loggableEntity(
    entity: Organization,
  ): Partial<Organization> {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
    };
  }

  protected override makeDuplicationErrorMessage(
    organization: Organization,
  ): string {
    return `Organization name '${organization.name}' already exists`;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    this.logger.info('Finding organization by slug', { slug });

    try {
      const organization = await this.repository.findOne({ where: { slug } });
      this.logger.info('Organization found by slug', {
        slug,
        found: !!organization,
      });
      return organization;
    } catch (error) {
      this.logger.error('Failed to find organization by slug', {
        slug,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async list(): Promise<Organization[]> {
    this.logger.info('Listing organizations');

    try {
      const organizations = await this.repository.find();
      this.logger.info('Organizations listed successfully', {
        count: organizations.length,
      });
      return organizations;
    } catch (error) {
      this.logger.error('Failed to list organizations', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
