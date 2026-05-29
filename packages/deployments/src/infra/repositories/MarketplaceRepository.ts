import { Repository } from 'typeorm';
import {
  GitRepoId,
  Marketplace,
  MarketplaceId,
  OrganizationId,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { AbstractRepository, localDataSource } from '@packmind/node-utils';
import {
  IMarketplaceRepository,
  MarketplaceStateUpdate,
} from '../../domain/repositories/IMarketplaceRepository';
import { MarketplaceSchema } from '../schemas/MarketplaceSchema';

const origin = 'MarketplaceRepository';

/**
 * TypeORM-backed implementation of `IMarketplaceRepository`.
 *
 * Inherits soft-delete-aware CRUD from `AbstractRepository`. The default
 * finders (`findById`, `findByOrganizationId`, etc.) exclude soft-deleted
 * rows; the unique partial index on `(organization_id, git_repo_id)` lets a
 * marketplace be re-linked after unlinking without colliding with the
 * historic row.
 */
export class MarketplaceRepository
  extends AbstractRepository<Marketplace>
  implements IMarketplaceRepository
{
  constructor(
    repository: Repository<Marketplace> = localDataSource.getRepository<Marketplace>(
      MarketplaceSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('marketplace', repository, MarketplaceSchema, logger);
    this.logger.info('MarketplaceRepository initialized');
  }

  protected override loggableEntity(entity: Marketplace): Partial<Marketplace> {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      gitRepoId: entity.gitRepoId,
      name: entity.name,
      vendor: entity.vendor,
      state: entity.state,
    };
  }

  async findByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<Marketplace[]> {
    this.logger.info('Finding marketplaces by organization ID', {
      organizationId,
    });

    try {
      const marketplaces = await this.repository
        .createQueryBuilder('marketplace')
        .where('marketplace.organizationId = :organizationId', {
          organizationId,
        })
        .orderBy('marketplace.linkedAt', 'DESC')
        .getMany();

      this.logger.info('Marketplaces found by organization ID', {
        organizationId,
        count: marketplaces.length,
      });
      return marketplaces;
    } catch (error) {
      this.logger.error('Failed to find marketplaces by organization ID', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByOrganizationAndGitRepo(
    organizationId: OrganizationId,
    gitRepoId: GitRepoId,
  ): Promise<Marketplace | null> {
    this.logger.info('Finding marketplace by organization and git repo', {
      organizationId,
      gitRepoId,
    });

    try {
      const marketplace = await this.repository
        .createQueryBuilder('marketplace')
        .where('marketplace.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('marketplace.gitRepoId = :gitRepoId', { gitRepoId })
        .getOne();

      this.logger.info('Marketplace lookup by organization and git repo', {
        organizationId,
        gitRepoId,
        found: !!marketplace,
      });
      return marketplace;
    } catch (error) {
      this.logger.error(
        'Failed to find marketplace by organization and git repo',
        {
          organizationId,
          gitRepoId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findByOrganizationAndId(
    organizationId: OrganizationId,
    id: MarketplaceId,
  ): Promise<Marketplace | null> {
    this.logger.info('Finding marketplace by organization and id', {
      organizationId,
      id,
    });

    try {
      const marketplace = await this.repository
        .createQueryBuilder('marketplace')
        .where('marketplace.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('marketplace.id = :id', { id })
        .getOne();

      this.logger.info('Marketplace lookup by organization and id', {
        organizationId,
        id,
        found: !!marketplace,
      });
      return marketplace;
    } catch (error) {
      this.logger.error('Failed to find marketplace by organization and id', {
        organizationId,
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findAllForReconciliation(): Promise<Marketplace[]> {
    this.logger.info('Finding all marketplaces for reconciliation sweep');

    try {
      const marketplaces = await this.repository
        .createQueryBuilder('marketplace')
        .orderBy('marketplace.linkedAt', 'ASC')
        .getMany();

      this.logger.info('Marketplaces fetched for reconciliation', {
        count: marketplaces.length,
      });
      return marketplaces;
    } catch (error) {
      this.logger.error('Failed to fetch marketplaces for reconciliation', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateState(
    id: MarketplaceId,
    patch: MarketplaceStateUpdate,
  ): Promise<void> {
    this.logger.info('Updating marketplace state', {
      id,
      state: patch.state,
      hasDescriptor: patch.descriptor !== undefined,
      hasPluginCount: patch.pluginCount !== undefined,
    });

    try {
      const updates: Partial<Marketplace> = {
        state: patch.state,
        lastValidatedAt: patch.lastValidatedAt,
      };

      if (patch.descriptor !== undefined) {
        updates.descriptor = patch.descriptor;
      }

      if (patch.pluginCount !== undefined) {
        updates.pluginCount = patch.pluginCount;
      }

      const result = await this.repository
        .createQueryBuilder()
        .update()
        .set(updates)
        .where('id = :id', { id })
        .execute();

      if (result.affected === 0) {
        this.logger.warn('No marketplace updated by updateState', { id });
        throw new Error(`No marketplace with id ${id} found`);
      }

      this.logger.info('Marketplace state updated successfully', {
        id,
        state: patch.state,
      });
    } catch (error) {
      this.logger.error('Failed to update marketplace state', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
