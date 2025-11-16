import { IKnowledgePatchRepository } from '../../domain/repositories/IKnowledgePatchRepository';
import { KnowledgePatchSchema } from '../schemas/KnowledgePatchSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import { KnowledgePatch, KnowledgePatchStatus, SpaceId } from '@packmind/types';

const origin = 'KnowledgePatchRepository';

export class KnowledgePatchRepository
  extends AbstractRepository<KnowledgePatch>
  implements IKnowledgePatchRepository
{
  constructor(
    repository: Repository<KnowledgePatch> = localDataSource.getRepository<KnowledgePatch>(
      KnowledgePatchSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('knowledge_patch', repository, logger, KnowledgePatchSchema);
    this.logger.info('KnowledgePatchRepository initialized');
  }

  protected override loggableEntity(
    entity: KnowledgePatch,
  ): Partial<KnowledgePatch> {
    return {
      id: entity.id,
      spaceId: entity.spaceId,
      patchType: entity.patchType,
      status: entity.status,
    };
  }

  async findBySpaceId(spaceId: SpaceId): Promise<KnowledgePatch[]> {
    this.logger.info('Finding knowledge patches by space ID', { spaceId });

    try {
      const patches = await this.repository
        .createQueryBuilder('knowledge_patch')
        .where('knowledge_patch.space_id = :spaceId', { spaceId })
        .orderBy('knowledge_patch.created_at', 'DESC')
        .getMany();

      this.logger.info('Knowledge patches found by space ID', {
        spaceId,
        count: patches.length,
      });
      return patches;
    } catch (error) {
      this.logger.error('Failed to find knowledge patches by space ID', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findPendingReview(spaceId: SpaceId): Promise<KnowledgePatch[]> {
    this.logger.info('Finding pending review knowledge patches', { spaceId });

    try {
      const patches = await this.repository
        .createQueryBuilder('knowledge_patch')
        .where('knowledge_patch.space_id = :spaceId', { spaceId })
        .andWhere('knowledge_patch.status = :status', {
          status: KnowledgePatchStatus.PENDING_REVIEW,
        })
        .orderBy('knowledge_patch.created_at', 'ASC')
        .getMany();

      this.logger.info('Pending review knowledge patches found', {
        spaceId,
        count: patches.length,
      });
      return patches;
    } catch (error) {
      this.logger.error('Failed to find pending review knowledge patches', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async addBatch(patches: KnowledgePatch[]): Promise<KnowledgePatch[]> {
    this.logger.info('Adding batch of knowledge patches', {
      count: patches.length,
    });

    try {
      const savedPatches = await this.repository.save(patches);
      this.logger.info('Batch of knowledge patches added successfully', {
        count: savedPatches.length,
      });
      return savedPatches;
    } catch (error) {
      this.logger.error('Failed to add batch of knowledge patches', {
        count: patches.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
