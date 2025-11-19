import {
  IRepository,
  Topic,
  SpaceId,
  TopicId,
  TopicStatus,
  KnowledgePatchId,
} from '@packmind/types';

export interface ITopicRepository extends IRepository<Topic> {
  findBySpaceId(spaceId: SpaceId): Promise<Topic[]>;
  updateStatus(id: TopicId, status: TopicStatus): Promise<void>;
  findPendingDigestion(spaceId: SpaceId): Promise<Topic[]>;
  findByKnowledgePatchId(patchId: KnowledgePatchId): Promise<Topic[]>;
  deleteTopic(id: TopicId, spaceId: SpaceId): Promise<void>;
}
