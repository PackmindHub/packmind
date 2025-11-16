import { UserId } from '../accounts/User';
import { SpaceId } from '../spaces/SpaceId';
import { TopicId } from './TopicId';
import { TopicCaptureContext } from './TopicCaptureContext';
import { WithTimestamps } from '../database/types';

export type CodeExample = {
  code: string;
  language: string;
};

export enum TopicStatus {
  PENDING = 'PENDING',
  DIGESTED = 'DIGESTED',
}

export type Topic = WithTimestamps<{
  id: TopicId;
  spaceId: SpaceId;
  title: string;
  content: string;
  codeExamples: CodeExample[];
  captureContext: TopicCaptureContext;
  createdBy: UserId;
  status: TopicStatus;
}>;
