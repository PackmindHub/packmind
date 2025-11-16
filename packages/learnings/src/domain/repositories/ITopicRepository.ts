import {
  IRepository,
  Topic,
  SpaceId,
  TopicId,
  TopicStatus,
} from '@packmind/types';

export interface ITopicRepository extends IRepository<Topic> {
  findBySpaceId(spaceId: SpaceId): Promise<Topic[]>;
  updateStatus(id: TopicId, status: TopicStatus): Promise<void>;
  findPendingDigestion(spaceId: SpaceId): Promise<Topic[]>;
}
