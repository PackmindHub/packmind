import { IUseCase, PackmindCommand } from '../../UseCase';
import { Topic, CodeExample } from '../Topic';
import { TopicCaptureContext } from '../TopicCaptureContext';

export type CaptureTopicCommand = PackmindCommand & {
  title: string;
  content: string;
  spaceId: string;
  codeExamples: CodeExample[];
  captureContext: TopicCaptureContext;
  userId: string;
};

export type CaptureTopicResponse = Topic;

export type ICaptureTopicUseCase = IUseCase<
  CaptureTopicCommand,
  CaptureTopicResponse
>;
