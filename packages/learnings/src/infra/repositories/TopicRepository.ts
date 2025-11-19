import { ITopicRepository } from '../../domain/repositories/ITopicRepository';
import { TopicSchema } from '../schemas/TopicSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import {
  Topic,
  SpaceId,
  TopicId,
  TopicStatus,
  KnowledgePatchId,
} from '@packmind/types';

const origin = 'TopicRepository';

export class TopicRepository
  extends AbstractRepository<Topic>
  implements ITopicRepository
{
  constructor(
    repository: Repository<Topic> = localDataSource.getRepository<Topic>(
      TopicSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('topic', repository, logger, TopicSchema);
    this.logger.info('TopicRepository initialized');
  }

  protected override loggableEntity(entity: Topic): Partial<Topic> {
    return {
      id: entity.id,
      title: entity.title,
      spaceId: entity.spaceId,
    };
  }

  async findBySpaceId(spaceId: SpaceId): Promise<Topic[]> {
    this.logger.info('Finding topics by space ID', { spaceId });

    try {
      const topics = await this.repository
        .createQueryBuilder('topic')
        .where('topic.space_id = :spaceId', { spaceId })
        .orderBy('topic.created_at', 'DESC')
        .getMany();

      this.logger.info('Topics found by space ID', {
        spaceId,
        count: topics.length,
      });
      return topics;
    } catch (error) {
      this.logger.error('Failed to find topics by space ID', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateStatus(id: TopicId, status: TopicStatus): Promise<void> {
    this.logger.info('Updating topic status', { id, status });

    try {
      await this.repository
        .createQueryBuilder()
        .update('topics')
        .set({ status })
        .where('id = :id', { id })
        .execute();

      this.logger.info('Topic status updated successfully', { id, status });
    } catch (error) {
      this.logger.error('Failed to update topic status', {
        id,
        status,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findPendingDigestion(spaceId: SpaceId): Promise<Topic[]> {
    this.logger.info('Finding pending digestion topics', { spaceId });

    try {
      const topics = await this.repository
        .createQueryBuilder('topic')
        .where('topic.space_id = :spaceId', { spaceId })
        .andWhere('topic.status = :status', { status: TopicStatus.PENDING })
        .orderBy('topic.created_at', 'ASC')
        .getMany();

      this.logger.info('Pending digestion topics found', {
        spaceId,
        count: topics.length,
      });
      return topics;
    } catch (error) {
      this.logger.error('Failed to find pending digestion topics', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByKnowledgePatchId(patchId: KnowledgePatchId): Promise<Topic[]> {
    this.logger.info('Finding topics by knowledge patch ID', { patchId });

    try {
      const topics = await this.repository
        .createQueryBuilder('topic')
        .innerJoin('topic_knowledge_patches', 'tkp', 'tkp.topic_id = topic.id')
        .where('tkp.knowledge_patch_id = :patchId', { patchId })
        .orderBy('topic.created_at', 'DESC')
        .getMany();

      this.logger.info('Topics found by knowledge patch ID', {
        patchId,
        count: topics.length,
      });
      return topics;
    } catch (error) {
      this.logger.error('Failed to find topics by knowledge patch ID', {
        patchId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async deleteTopic(id: TopicId, spaceId: SpaceId): Promise<void> {
    this.logger.info('Deleting topic', { id, spaceId });

    try {
      const topic = await this.repository.findOne({
        where: { id, spaceId },
      });

      if (!topic) {
        throw new Error(`Topic with id ${id} not found in space ${spaceId}`);
      }

      await this.deleteById(id);

      this.logger.info('Topic deleted successfully', { id, spaceId });
    } catch (error) {
      this.logger.error('Failed to delete topic', {
        id,
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
