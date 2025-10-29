import { Standard } from '../../domain/entities/Standard';
import { IStandardRepository } from '../../domain/repositories/IStandardRepository';
import { StandardSchema } from '../schemas/StandardSchema';
import { StandardVersionSchema } from '../schemas/StandardVersionSchema';
import { Repository } from 'typeorm';
import {
  PackmindLogger,
  localDataSource,
  AbstractRepository,
} from '@packmind/shared';
import { OrganizationId, UserId } from '@packmind/accounts';
import { SpaceId } from '@packmind/shared/types';
import { StandardVersion } from '../../domain/entities/StandardVersion';

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
    super('standard', repository, logger, StandardSchema);
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
  ): Promise<Standard | null> {
    this.logger.info('Finding standard with scope by slug and organization', {
      slug,
      organizationId,
    });

    try {
      // Query standards by slug across all spaces in the organization
      // Join with spaces table to filter by organizationId
      const standard = await this.repository
        .createQueryBuilder('standard')
        .innerJoin('spaces', 'space', 'standard.space_id = space.id')
        .leftJoinAndSelect('standard.gitCommit', 'gitCommit')
        .where('standard.slug = :slug', { slug })
        .andWhere('space.organization_id = :organizationId', { organizationId })
        .andWhere('standard.deleted_at IS NULL')
        .getOne();

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

  async findByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<Standard[]> {
    this.logger.warn(
      'findByOrganizationId is deprecated - standards are now space-scoped',
      {
        organizationId,
      },
    );
    // Standards no longer have organizationId - they are space-scoped
    // This method is deprecated and will return an empty array
    return [];

    // Old implementation (no longer works after organizationId column was dropped):
    /*
    try {
      // First, get all standards for the organization
      const standards = await this.repository.find({
        where: { organizationId },
        relations: ['gitCommit'],
      });

      // For each standard, get the latest version to retrieve scope
      const standardsWithScope = await Promise.all(
        standards.map(async (standard) => {
          // Get the latest version for this standard
          const latestVersion = await this.repository.manager
            .getRepository<StandardVersion>(StandardVersionSchema)
            .findOne({
              where: { standardId: standard.id },
              order: { version: 'DESC' },
            });

          return {
            ...standard,
            scope: latestVersion?.scope ?? standard.scope,
          };
        }),
      );

      this.logger.info('Standards with scope found by organization ID', {
        organizationId,
        count: standardsWithScope.length,
      });
      return standardsWithScope;
    } catch (error) {
      this.logger.error(
        'Failed to find standards with scope by organization ID',
        {
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
    */
  }

  async findBySpaceId(spaceId: SpaceId): Promise<Standard[]> {
    this.logger.info('Finding standards with scope by space ID', {
      spaceId,
    });

    try {
      // First, get all standards for the space
      const standards = await this.repository.find({
        where: { spaceId },
        relations: ['gitCommit'],
      });

      // For each standard, get the latest version to retrieve scope
      const standardsWithScope = await Promise.all(
        standards.map(async (standard) => {
          // Get the latest version for this standard
          const latestVersion = await this.repository.manager
            .getRepository<StandardVersion>(StandardVersionSchema)
            .findOne({
              where: { standardId: standard.id },
              order: { version: 'DESC' },
            });

          return {
            ...standard,
            scope: latestVersion?.scope ?? standard.scope,
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

  async findByOrganizationAndUser(
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<Standard[]> {
    this.logger.warn(
      'findByOrganizationAndUser is deprecated - standards are now space-scoped',
      {
        organizationId,
        userId,
      },
    );
    // Standards no longer have organizationId - they are space-scoped
    // This method is deprecated and will return an empty array
    return [];

    // Old implementation (no longer works after organizationId column was dropped):
    /*
    try {
      const standards = await this.repository.find({
        where: { organizationId, userId },
      });
      this.logger.info('Standards found by organization and user ID', {
        organizationId,
        userId,
        count: standards.length,
      });
      return standards;
    } catch (error) {
      this.logger.error(
        'Failed to find standards by organization and user ID',
        {
          organizationId,
          userId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
    */
  }
}
