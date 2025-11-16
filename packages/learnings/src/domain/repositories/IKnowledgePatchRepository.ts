import { IRepository, KnowledgePatch, SpaceId, TopicId } from '@packmind/types';

export interface IKnowledgePatchRepository extends IRepository<KnowledgePatch> {
  findByTopicId(topicId: TopicId): Promise<KnowledgePatch[]>;
  findBySpaceId(spaceId: SpaceId): Promise<KnowledgePatch[]>;
  findPendingReview(spaceId: SpaceId): Promise<KnowledgePatch[]>;
  addBatch(patches: KnowledgePatch[]): Promise<KnowledgePatch[]>;
}
