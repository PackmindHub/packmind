import { Factory } from '@packmind/test-utils';
import {
  createSpaceId,
  createUserId,
  Topic,
  createTopicId,
  TopicCaptureContext,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export const topicFactory: Factory<Topic> = (topic?: Partial<Topic>) => {
  return {
    id: createTopicId(uuidv4()),
    title: 'Test Technical Decision',
    content: 'This is a test technical decision content',
    codeExamples: [],
    captureContext: TopicCaptureContext.MCP_TOOL,
    createdBy: createUserId(uuidv4()),
    spaceId: createSpaceId(uuidv4()),
    ...topic,
  };
};
