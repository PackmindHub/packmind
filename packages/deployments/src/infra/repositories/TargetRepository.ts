import { Repository, SelectQueryBuilder } from 'typeorm';
import { Target, TargetId, GitRepoId, OrganizationId } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import {
  localDataSource,
  OrganizationScopedRepository,
} from '@packmind/node-utils';
import { ITargetRepository } from '../../domain/repositories/ITargetRepository';
import { TargetSchema } from '../schemas/TargetSchema';

const origin = 'TargetRepository';

export class TargetRepository
  extends OrganizationScopedRepository<Target>
  implements ITargetRepository
{
  constructor(
    repository: Repository<Target> = localDataSource.getRepository<Target>(
      TargetSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('target', repository, TargetSchema, logger);
    this.logger.info('TargetRepository initialized');
  }

  protected override getEntityAlias(): string {
    return 'target';
  }

  protected override applyOrganizationScope(
    qb: SelectQueryBuilder<Target>,
    organizationId: string,
  ): SelectQueryBuilder<Target> {
    return qb
      .innerJoin('target.gitRepo', 'gitRepo')
      .innerJoin('gitRepo.provider', 'gitProvider')
      .andWhere('gitProvider.organizationId = :organizationId', {
        organizationId,
      });
  }

  protected override loggableEntity(target: Target): Partial<Target> {
    return {
      id: target.id,
      name: target.name,
      path: target.path,
      gitRepoId: target.gitRepoId,
    };
  }

  async findByIdsInOrganization(
    targetIds: TargetId[],
    organizationId: OrganizationId,
  ): Promise<Target[]> {
    this.logger.info('Finding targets by IDs within organization', {
      targetIdsCount: targetIds.length,
      organizationId,
    });

    if (targetIds.length === 0) {
      return [];
    }

    try {
      const qb = this.createScopedQueryBuilder(organizationId);
      qb.andWhere('target.id IN (:...targetIds)', {
        targetIds: targetIds as string[],
      });
      const targets = await qb.getMany();

      this.logger.info('Targets found by IDs within organization', {
        organizationId,
        requestedCount: targetIds.length,
        foundCount: targets.length,
      });

      return targets;
    } catch (error) {
      this.logger.error('Failed to find targets by IDs within organization', {
        organizationId,
        targetIdsCount: targetIds.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByGitRepoId(gitRepoId: GitRepoId): Promise<Target[]> {
    this.logger.info('Finding targets by git repository ID', {
      gitRepoId,
    });

    try {
      const targets = await this.repository
        .createQueryBuilder('target')
        .where('target.gitRepoId = :gitRepoId', { gitRepoId })
        .orderBy('target.createdAt', 'ASC')
        .getMany();

      this.logger.info('Targets found by git repository ID successfully', {
        gitRepoId,
        count: targets.length,
      });

      return targets;
    } catch (error) {
      this.logger.error('Failed to find targets by git repository ID', {
        gitRepoId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateById(
    id: TargetId,
    updates: Partial<Pick<Target, 'name' | 'path'>>,
  ): Promise<Target> {
    this.logger.info('Updating target by ID', { id, updates });

    try {
      // First check if target exists
      const existingTarget = await this.findById(id);
      if (!existingTarget) {
        throw new Error(`No target with id ${id} found`);
      }

      // Prevent updating Root target (path '/')
      if (existingTarget.path === '/') {
        throw new Error('Root target cannot be updated');
      }

      // Update the target
      const result = await this.repository
        .createQueryBuilder()
        .update()
        .set(updates)
        .where('id = :id', { id })
        .execute();

      if (result.affected === 0) {
        throw new Error(`No target with id ${id} found`);
      }

      // Fetch and return the updated target
      const updatedTarget = await this.findById(id);
      if (!updatedTarget) {
        throw new Error(`Failed to retrieve updated target with id ${id}`);
      }

      this.logger.info('Target updated successfully', { id, updates });
      return updatedTarget;
    } catch (error) {
      this.logger.error('Failed to update target by ID', {
        id,
        updates,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
