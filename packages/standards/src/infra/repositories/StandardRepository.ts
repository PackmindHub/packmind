import { IStandardRepository } from '../../domain/repositories/IStandardRepository';
import { StandardSchema } from '../schemas/StandardSchema';
import { StandardVersionSchema } from '../schemas/StandardVersionSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import {
  OrganizationId,
  QueryOption,
  SpaceId,
  Standard,
  StandardId,
  StandardVersion,
  UserId,
} from '@packmind/types';

const origin = 'StandardRepository';

export class StandardRepository
  extends AbstractRepository<Standard>
  implements IStandardRepository
{
  constructor(
    repository: Repository<Standard> = localDataSource.getRepository<Standard>(
      StandardSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('standard', repository, StandardSchema, logger);
    this.logger.info('StandardRepository initialized');
  }

  protected override loggableEntity(entity: Standard): Partial<Standard> {
    return {
      id: entity.id,
      name: entity.name,
    };
  }

  async findBySlug(
    slug: string,
    organizationId: OrganizationId,
    opts?: QueryOption,
  ): Promise<Standard | null> {
    this.logger.info('Finding standard with scope by slug and organization', {
      slug,
      organizationId,
    });

    try {
      // Query standards by slug across all spaces in the organization
      // Join with spaces table to filter by organizationId
      const queryBuilder = this.repository
        .createQueryBuilder('standard')
        .innerJoin('spaces', 'space', 'standard.space_id = space.id')
        .leftJoinAndSelect('standard.gitCommit', 'gitCommit')
        .where('standard.slug = :slug', { slug })
        .andWhere('space.organization_id = :organizationId', {
          organizationId,
        });

      if (opts?.includeDeleted) {
        queryBuilder.withDeleted();
      }
      const standard = await queryBuilder.getOne();

      if (!standard) {
        this.logger.warn('Standard not found by slug and organization', {
          slug,
          organizationId,
        });
        return null;
      }

      // Get the latest version for this standard to retrieve scope
      const latestVersion = await this.repository.manager
        .getRepository<StandardVersion>(StandardVersionSchema)
        .findOne({
          where: { standardId: standard.id },
          order: { version: 'DESC' },
        });

      const standardWithScope = {
        ...standard,
        scope: latestVersion?.scope ?? standard.scope,
      };

      this.logger.info('Standard with scope found by slug and organization', {
        slug,
        organizationId,
        standardId: standard.id,
      });
      return standardWithScope;
    } catch (error) {
      this.logger.error(
        'Failed to find standard with scope by slug and organization',
        {
          slug,
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findBySpaceId(
    spaceId: SpaceId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Standard[]> {
    this.logger.info('Finding standards with scope by space ID', {
      spaceId,
      includeDeleted: opts?.includeDeleted ?? false,
    });

    try {
      // First, get all standards for the space with user information
      const standards = await this.repository.find({
        where: { spaceId },
        relations: ['gitCommit'],
        withDeleted: opts?.includeDeleted ?? false,
      });

      // For each standard, get the latest version to retrieve scope and enrich with user data
      const standardsWithScope = await Promise.all(
        standards.map(async (standard) => {
          // Get the latest version for this standard
          const latestVersion = await this.repository.manager
            .getRepository<StandardVersion>(StandardVersionSchema)
            .findOne({
              where: { standardId: standard.id },
              order: { version: 'DESC' },
            });

          const createdBy = await this.getCreatedBy(standard.userId);

          return {
            ...standard,
            scope: latestVersion?.scope ?? standard.scope,
            createdBy,
          };
        }),
      );

      this.logger.info('Standards with scope found by space ID', {
        spaceId,
        count: standardsWithScope.length,
      });
      return standardsWithScope;
    } catch (error) {
      this.logger.error('Failed to find standards with scope by space ID', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByUserId(userId: UserId): Promise<Standard[]> {
    this.logger.info('Finding standards by user ID', { userId });

    try {
      const standards = await this.repository.find({ where: { userId } });
      this.logger.info('Standards found by user ID', {
        userId,
        count: standards.length,
      });
      return standards;
    } catch (error) {
      this.logger.error('Failed to find standards by user ID', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async markAsMoved(
    standardId: StandardId,
    destinationSpaceId: SpaceId,
  ): Promise<void> {
    this.logger.info('Marking standard as moved', {
      standardId,
      destinationSpaceId,
    });

    try {
      await this.repository.manager.transaction(async (transaction) => {
        await transaction.update(
          StandardSchema,
          { id: standardId },
          {
            movedTo: destinationSpaceId,
          },
        );
        await transaction.softDelete(StandardSchema, { id: standardId });
      });

      this.logger.info('Standard marked as moved successfully', {
        standardId,
        destinationSpaceId,
      });
    } catch (error) {
      this.logger.error('Failed to mark standard as moved', {
        standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
