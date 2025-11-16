import { TopicId } from './TopicId';
import { KnowledgePatchId } from './KnowledgePatchId';

export type TopicKnowledgePatch = {
  topicId: TopicId;
  knowledgePatchId: KnowledgePatchId;
  createdAt: Date;
};
