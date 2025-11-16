import { Factory } from '@packmind/test-utils';
import {
  TopicKnowledgePatch,
  createTopicId,
  createKnowledgePatchId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export const topicKnowledgePatchFactory: Factory<TopicKnowledgePatch> = (
  relation?: Partial<TopicKnowledgePatch>,
) => {
  return {
    topicId: createTopicId(uuidv4()),
    knowledgePatchId: createKnowledgePatchId(uuidv4()),
    createdAt: new Date(),
    ...relation,
  };
};
