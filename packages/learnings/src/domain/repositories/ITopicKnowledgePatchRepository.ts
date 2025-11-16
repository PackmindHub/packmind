import {
  IRepository,
  TopicKnowledgePatch,
  TopicId,
  KnowledgePatchId,
} from '@packmind/types';

export interface ITopicKnowledgePatchRepository
  extends IRepository<TopicKnowledgePatch> {
  linkTopicToPatch(topicId: TopicId, patchId: KnowledgePatchId): Promise<void>;
  linkTopicToPatches(
    topicId: TopicId,
    patchIds: KnowledgePatchId[],
  ): Promise<void>;
  findPatchIdsByTopicId(topicId: TopicId): Promise<KnowledgePatchId[]>;
  findTopicIdsByPatchId(patchId: KnowledgePatchId): Promise<TopicId[]>;
}
