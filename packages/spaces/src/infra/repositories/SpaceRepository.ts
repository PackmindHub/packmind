import { PackmindLogger } from '@packmind/logger';
import { AbstractRepository, localDataSource } from '@packmind/node-utils';
import { OrganizationId, Space, SpaceId, SpaceType } from '@packmind/types';
import { Repository } from 'typeorm';
import { ISpaceRepository } from '../../domain/repositories/ISpaceRepository';
import { SpaceSchema } from '../schemas/SpaceSchema';

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
    super('space', repository, SpaceSchema, logger);
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

  async updateFields(
    id: SpaceId,
    fields: { name?: string; slug?: string; type?: SpaceType },
  ): Promise<Space> {
    this.logger.info('Updating space fields', { id, fields });

    try {
      const space = await this.repository.findOne({ where: { id } });
      if (!space) {
        throw new Error(`Space ${id} not found`);
      }

      if (fields.name !== undefined) space.name = fields.name;
      if (fields.slug !== undefined) space.slug = fields.slug;
      if (fields.type !== undefined) space.type = fields.type;

      const updated = await this.repository.save(space);
      this.logger.info('Space updated successfully', { id });
      return updated;
    } catch (error) {
      this.logger.error('Failed to update space', {
        id,
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
