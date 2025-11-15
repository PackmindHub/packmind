import { UserId } from '../accounts/User';
import { SpaceId } from '../spaces/SpaceId';
import { TopicId } from './TopicId';
import { TopicCaptureContext } from './TopicCaptureContext';

export type CodeExample = {
  code: string;
  language: string;
};

export type Topic = {
  id: TopicId;
  spaceId: SpaceId;
  title: string;
  content: string;
  codeExamples: CodeExample[];
  captureContext: TopicCaptureContext;
  createdBy: UserId;
};
