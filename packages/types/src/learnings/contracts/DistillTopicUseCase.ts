import { IUseCase, PackmindCommand } from '../../UseCase';
import { KnowledgePatchId } from '../KnowledgePatchId';
import { TopicId } from '../TopicId';

export type DistillTopicCommand = PackmindCommand & {
  topicId: TopicId;
  userId: string;
};

export type DistillTopicResponse = {
  jobId: string;
  topicId: TopicId;
  patchIds: KnowledgePatchId[];
};

export type IDistillTopicUseCase = IUseCase<
  DistillTopicCommand,
  DistillTopicResponse
>;
