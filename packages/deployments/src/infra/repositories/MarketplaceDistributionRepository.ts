import { Repository } from 'typeorm';
import {
  DistributionStatus,
  MarketplaceDistribution,
  MarketplaceDistributionId,
  MarketplaceId,
  PackageId,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { AbstractRepository, localDataSource } from '@packmind/node-utils';
import {
  IMarketplaceDistributionRepository,
  MarketplaceDistributionStatusUpdate,
} from '../../domain/repositories/IMarketplaceDistributionRepository';
import { MarketplaceDistributionSchema } from '../schemas/MarketplaceDistributionSchema';

const origin = 'MarketplaceDistributionRepository';

/**
 * TypeORM-backed implementation of `IMarketplaceDistributionRepository`.
 *
 * Inherits soft-delete-aware CRUD from `AbstractRepository`. The default
 * finders (`findById`, `findByMarketplaceId`, etc.) exclude soft-deleted
 * rows so audit history survives package/marketplace removal without
 * cluttering the live UI.
 */
export class MarketplaceDistributionRepository
  extends AbstractRepository<MarketplaceDistribution>
  implements IMarketplaceDistributionRepository
{
  constructor(
    repository: Repository<MarketplaceDistribution> = localDataSource.getRepository<MarketplaceDistribution>(
      MarketplaceDistributionSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(
      'marketplace-distribution',
      repository,
      MarketplaceDistributionSchema,
      logger,
    );
    this.logger.info('MarketplaceDistributionRepository initialized');
  }

  protected override loggableEntity(
    entity: MarketplaceDistribution,
  ): Partial<MarketplaceDistribution> {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      marketplaceId: entity.marketplaceId,
      packageId: entity.packageId,
      pluginSlug: entity.pluginSlug,
      status: entity.status,
      source: entity.source,
    };
  }

  async findByMarketplaceId(
    marketplaceId: MarketplaceId,
  ): Promise<MarketplaceDistribution[]> {
    this.logger.info('Finding marketplace distributions by marketplace ID', {
      marketplaceId,
    });

    try {
      const rows = await this.repository
        .createQueryBuilder('marketplace_distribution')
        .where('marketplace_distribution.marketplaceId = :marketplaceId', {
          marketplaceId,
        })
        .orderBy('marketplace_distribution.createdAt', 'DESC')
        .getMany();

      this.logger.info('Marketplace distributions found by marketplace ID', {
        marketplaceId,
        count: rows.length,
      });
      return rows;
    } catch (error) {
      this.logger.error(
        'Failed to find marketplace distributions by marketplace ID',
        {
          marketplaceId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findByPackageId(
    packageId: PackageId,
  ): Promise<MarketplaceDistribution[]> {
    this.logger.info('Finding marketplace distributions by package ID', {
      packageId,
    });

    try {
      const rows = await this.repository
        .createQueryBuilder('marketplace_distribution')
        .where('marketplace_distribution.packageId = :packageId', {
          packageId,
        })
        .orderBy('marketplace_distribution.createdAt', 'DESC')
        .getMany();

      this.logger.info('Marketplace distributions found by package ID', {
        packageId,
        count: rows.length,
      });
      return rows;
    } catch (error) {
      this.logger.error(
        'Failed to find marketplace distributions by package ID',
        {
          packageId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findLatestByPackageAndMarketplace(
    packageId: PackageId,
    marketplaceId: MarketplaceId,
  ): Promise<MarketplaceDistribution | null> {
    this.logger.info(
      'Finding latest marketplace distribution by package and marketplace',
      { packageId, marketplaceId },
    );

    try {
      const row = await this.repository
        .createQueryBuilder('marketplace_distribution')
        .where('marketplace_distribution.packageId = :packageId', {
          packageId,
        })
        .andWhere('marketplace_distribution.marketplaceId = :marketplaceId', {
          marketplaceId,
        })
        .orderBy('marketplace_distribution.createdAt', 'DESC')
        .getOne();

      this.logger.info(
        'Latest marketplace distribution lookup by package and marketplace',
        { packageId, marketplaceId, found: !!row },
      );
      return row;
    } catch (error) {
      this.logger.error(
        'Failed to find latest marketplace distribution by package and marketplace',
        {
          packageId,
          marketplaceId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findLatestActiveByPackageAndMarketplace(
    packageId: PackageId,
    marketplaceId: MarketplaceId,
  ): Promise<MarketplaceDistribution | null> {
    this.logger.info(
      'Finding latest active marketplace distribution by package and marketplace',
      { packageId, marketplaceId },
    );

    try {
      const row = await this.repository
        .createQueryBuilder('marketplace_distribution')
        .where('marketplace_distribution.packageId = :packageId', {
          packageId,
        })
        .andWhere('marketplace_distribution.marketplaceId = :marketplaceId', {
          marketplaceId,
        })
        .andWhere('marketplace_distribution.status IN (:...statuses)', {
          statuses: [
            DistributionStatus.success,
            DistributionStatus.pending_merge,
          ],
        })
        .orderBy('marketplace_distribution.createdAt', 'DESC')
        .getOne();

      this.logger.info(
        'Latest active marketplace distribution lookup completed',
        { packageId, marketplaceId, found: !!row },
      );
      return row;
    } catch (error) {
      this.logger.error(
        'Failed to find latest active marketplace distribution',
        {
          packageId,
          marketplaceId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findActiveByPackageId(
    packageId: PackageId,
  ): Promise<MarketplaceDistribution[]> {
    this.logger.info(
      'Finding active (success or pending_merge) marketplace distributions by package ID',
      { packageId },
    );

    try {
      const rows = await this.repository
        .createQueryBuilder('marketplace_distribution')
        .where('marketplace_distribution.packageId = :packageId', {
          packageId,
        })
        .andWhere('marketplace_distribution.status IN (:...statuses)', {
          statuses: [
            DistributionStatus.success,
            DistributionStatus.pending_merge,
          ],
        })
        .orderBy('marketplace_distribution.createdAt', 'DESC')
        .getMany();

      this.logger.info('Active marketplace distributions found by package ID', {
        packageId,
        count: rows.length,
      });
      return rows;
    } catch (error) {
      this.logger.error(
        'Failed to find active marketplace distributions by package ID',
        {
          packageId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findPendingMergesByMarketplaceId(
    marketplaceId: MarketplaceId,
  ): Promise<MarketplaceDistribution[]> {
    this.logger.info(
      'Finding pending-merge marketplace distributions by marketplace ID',
      { marketplaceId },
    );

    try {
      const rows = await this.repository
        .createQueryBuilder('marketplace_distribution')
        .where('marketplace_distribution.marketplaceId = :marketplaceId', {
          marketplaceId,
        })
        .andWhere('marketplace_distribution.status = :status', {
          status: DistributionStatus.pending_merge,
        })
        .orderBy('marketplace_distribution.createdAt', 'DESC')
        .getMany();

      this.logger.info(
        'Pending-merge marketplace distributions found by marketplace ID',
        { marketplaceId, count: rows.length },
      );
      return rows;
    } catch (error) {
      this.logger.error(
        'Failed to find pending-merge marketplace distributions',
        {
          marketplaceId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findPendingRemovalsByMarketplaceId(
    marketplaceId: MarketplaceId,
  ): Promise<MarketplaceDistribution[]> {
    this.logger.info(
      'Finding pending-removal marketplace distributions by marketplace ID',
      { marketplaceId },
    );

    try {
      const rows = await this.repository
        .createQueryBuilder('marketplace_distribution')
        .where('marketplace_distribution.marketplaceId = :marketplaceId', {
          marketplaceId,
        })
        .andWhere('marketplace_distribution.status = :status', {
          status: DistributionStatus.to_be_removed,
        })
        .orderBy('marketplace_distribution.createdAt', 'DESC')
        .getMany();

      this.logger.info(
        'Pending-removal marketplace distributions found by marketplace ID',
        { marketplaceId, count: rows.length },
      );
      return rows;
    } catch (error) {
      this.logger.error(
        'Failed to find pending-removal marketplace distributions',
        {
          marketplaceId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findSuccessfulByMarketplaceId(
    marketplaceId: MarketplaceId,
  ): Promise<MarketplaceDistribution[]> {
    this.logger.info(
      'Finding successful marketplace distributions by marketplace ID',
      { marketplaceId },
    );

    try {
      const rows = await this.repository
        .createQueryBuilder('marketplace_distribution')
        .where('marketplace_distribution.marketplaceId = :marketplaceId', {
          marketplaceId,
        })
        .andWhere('marketplace_distribution.status = :status', {
          status: DistributionStatus.success,
        })
        .orderBy('marketplace_distribution.createdAt', 'DESC')
        .getMany();

      this.logger.info(
        'Successful marketplace distributions found by marketplace ID',
        { marketplaceId, count: rows.length },
      );
      return rows;
    } catch (error) {
      this.logger.error('Failed to find successful marketplace distributions', {
        marketplaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateStatus(
    id: MarketplaceDistributionId,
    patch: MarketplaceDistributionStatusUpdate,
  ): Promise<void> {
    this.logger.info('Updating marketplace distribution status', {
      id,
      status: patch.status,
      hasPrUrl: patch.prUrl !== undefined,
      hasGitCommit: patch.gitCommit !== undefined,
      hasError: patch.error !== undefined,
      hasFailureReason: patch.failureReason !== undefined,
      hasContentHash: patch.contentHash !== undefined,
    });

    try {
      const updates: Partial<MarketplaceDistribution> = {
        status: patch.status,
      };

      if (patch.prUrl !== undefined) {
        updates.prUrl = patch.prUrl;
      }
      if (patch.gitCommit !== undefined) {
        updates.gitCommit = patch.gitCommit;
      }
      if (patch.error !== undefined) {
        updates.error = patch.error;
      }
      if (patch.failureReason !== undefined) {
        updates.failureReason = patch.failureReason;
      }
      if (patch.contentHash !== undefined) {
        updates.contentHash = patch.contentHash;
      }
      if (patch.versionFingerprint !== undefined) {
        updates.versionFingerprint = patch.versionFingerprint;
      }
      if (patch.publishConfirmedAt !== undefined) {
        updates.publishConfirmedAt = patch.publishConfirmedAt;
      }

      const result = await this.repository
        .createQueryBuilder()
        .update()
        .set(updates)
        .where('id = :id', { id })
        .execute();

      if (result.affected === 0) {
        this.logger.warn(
          'No marketplace distribution updated by updateStatus',
          { id },
        );
        throw new Error(`No marketplace distribution with id ${id} found`);
      }

      this.logger.info('Marketplace distribution status updated successfully', {
        id,
        status: patch.status,
      });
    } catch (error) {
      this.logger.error('Failed to update marketplace distribution status', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateRemovalRequestedAt(
    id: MarketplaceDistributionId,
    removalRequestedAt: Date | null,
  ): Promise<void> {
    this.logger.info('Updating marketplace distribution removalRequestedAt', {
      id,
      requested: removalRequestedAt !== null,
    });

    try {
      const result = await this.repository
        .createQueryBuilder()
        .update()
        .set({ removalRequestedAt })
        .where('id = :id', { id })
        .execute();

      if (result.affected === 0) {
        this.logger.warn(
          'No marketplace distribution updated by updateRemovalRequestedAt',
          { id },
        );
        throw new Error(`No marketplace distribution with id ${id} found`);
      }

      this.logger.info(
        'Marketplace distribution removalRequestedAt updated successfully',
        { id, requested: removalRequestedAt !== null },
      );
    } catch (error) {
      this.logger.error(
        'Failed to update marketplace distribution removalRequestedAt',
        {
          id,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
