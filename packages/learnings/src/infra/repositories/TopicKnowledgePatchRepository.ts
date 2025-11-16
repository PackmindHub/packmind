import { ITopicKnowledgePatchRepository } from '../../domain/repositories/ITopicKnowledgePatchRepository';
import { TopicKnowledgePatchSchema } from '../schemas/TopicKnowledgePatchSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource } from '@packmind/node-utils';
import {
  TopicKnowledgePatch,
  TopicId,
  KnowledgePatchId,
} from '@packmind/types';

const origin = 'TopicKnowledgePatchRepository';

export class TopicKnowledgePatchRepository
  implements ITopicKnowledgePatchRepository
{
  private readonly repository: Repository<TopicKnowledgePatch>;
  private readonly logger: PackmindLogger;

  constructor(
    repository: Repository<TopicKnowledgePatch> = localDataSource.getRepository<TopicKnowledgePatch>(
      TopicKnowledgePatchSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.repository = repository;
    this.logger = logger;
    this.logger.info('TopicKnowledgePatchRepository initialized');
  }

  async linkTopicToPatch(
    topicId: TopicId,
    patchId: KnowledgePatchId,
  ): Promise<void> {
    this.logger.info('Linking topic to patch', { topicId, patchId });

    try {
      await this.repository
        .createQueryBuilder()
        .insert()
        .into('topic_knowledge_patches')
        .values({
          topicId,
          knowledgePatchId: patchId,
          createdAt: new Date(),
        })
        .orIgnore()
        .execute();

      this.logger.info('Topic linked to patch successfully', {
        topicId,
        patchId,
      });
    } catch (error) {
      this.logger.error('Failed to link topic to patch', {
        topicId,
        patchId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async linkTopicToPatches(
    topicId: TopicId,
    patchIds: KnowledgePatchId[],
  ): Promise<void> {
    this.logger.info('Linking topic to multiple patches', {
      topicId,
      patchCount: patchIds.length,
    });

    if (patchIds.length === 0) {
      this.logger.info('No patches to link, skipping');
      return;
    }

    try {
      const values = patchIds.map((patchId) => ({
        topicId,
        knowledgePatchId: patchId,
        createdAt: new Date(),
      }));

      await this.repository
        .createQueryBuilder()
        .insert()
        .into('topic_knowledge_patches')
        .values(values)
        .orIgnore()
        .execute();

      this.logger.info('Topic linked to patches successfully', {
        topicId,
        patchCount: patchIds.length,
      });
    } catch (error) {
      this.logger.error('Failed to link topic to patches', {
        topicId,
        patchCount: patchIds.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findPatchIdsByTopicId(topicId: TopicId): Promise<KnowledgePatchId[]> {
    this.logger.info('Finding patch IDs by topic ID', { topicId });

    try {
      const results = await this.repository
        .createQueryBuilder('tkp')
        .select('tkp.knowledge_patch_id', 'knowledgePatchId')
        .where('tkp.topic_id = :topicId', { topicId })
        .orderBy('tkp.created_at', 'ASC')
        .getRawMany<{ knowledgePatchId: KnowledgePatchId }>();

      const patchIds = results.map((r) => r.knowledgePatchId);

      this.logger.info('Patch IDs found by topic ID', {
        topicId,
        count: patchIds.length,
      });
      return patchIds;
    } catch (error) {
      this.logger.error('Failed to find patch IDs by topic ID', {
        topicId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findTopicIdsByPatchId(patchId: KnowledgePatchId): Promise<TopicId[]> {
    this.logger.info('Finding topic IDs by patch ID', { patchId });

    try {
      const results = await this.repository
        .createQueryBuilder('tkp')
        .select('tkp.topic_id', 'topicId')
        .where('tkp.knowledge_patch_id = :patchId', { patchId })
        .orderBy('tkp.created_at', 'ASC')
        .getRawMany<{ topicId: TopicId }>();

      const topicIds = results.map((r) => r.topicId);

      this.logger.info('Topic IDs found by patch ID', {
        patchId,
        count: topicIds.length,
      });
      return topicIds;
    } catch (error) {
      this.logger.error('Failed to find topic IDs by patch ID', {
        patchId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
