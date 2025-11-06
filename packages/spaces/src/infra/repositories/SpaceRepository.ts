import { Repository } from 'typeorm';
import { Space } from '../../domain/entities/Space';
import { ISpaceRepository } from '../../domain/repositories/ISpaceRepository';
import { SpaceSchema } from '../schemas/SpaceSchema';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import { OrganizationId } from '@packmind/types';

const origin = 'SpaceRepository';

export class SpaceRepository
  extends AbstractRepository<Space>
  implements ISpaceRepository
{
  constructor(
    repository: Repository<Space> = localDataSource.getRepository<Space>(
      SpaceSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('space', repository, logger, SpaceSchema);
    this.logger.info('SpaceRepository initialized');
  }

  protected override loggableEntity(entity: Space): Partial<Space> {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      organizationId: entity.organizationId,
    };
  }

  protected override makeDuplicationErrorMessage(space: Space): string {
    return `Space slug '${space.slug}' already exists in organization ${space.organizationId}`;
  }

  async findBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Space | null> {
    this.logger.info('Finding space by slug and organizationId', {
      slug,
      organizationId,
    });

    try {
      const space = await this.repository.findOne({
        where: { slug, organizationId },
      });
      this.logger.info('Space found by slug and organizationId', {
        slug,
        organizationId,
        found: !!space,
      });
      return space;
    } catch (error) {
      this.logger.error('Failed to find space by slug and organizationId', {
        slug,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByOrganizationId(organizationId: OrganizationId): Promise<Space[]> {
    this.logger.info('Finding spaces by organizationId', { organizationId });

    try {
      const spaces = await this.repository.find({ where: { organizationId } });
      this.logger.info('Spaces found by organizationId', {
        organizationId,
        count: spaces.length,
      });
      return spaces;
    } catch (error) {
      this.logger.error('Failed to find spaces by organizationId', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async list(): Promise<Space[]> {
    this.logger.info('Listing spaces');

    try {
      const spaces = await this.repository.find();
      this.logger.info('Spaces listed successfully', {
        count: spaces.length,
      });
      return spaces;
    } catch (error) {
      this.logger.error('Failed to list spaces', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
