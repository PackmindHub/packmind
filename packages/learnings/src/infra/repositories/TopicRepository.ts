import { ITopicRepository } from '../../domain/repositories/ITopicRepository';
import { TopicSchema } from '../schemas/TopicSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import { Topic, SpaceId } from '@packmind/types';

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
}
