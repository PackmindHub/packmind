import { IUseCase, PackmindCommand } from '../../UseCase';
import { KnowledgePatchId } from '../KnowledgePatchId';
import { TopicId } from '../TopicId';
import { OrganizationId } from '../../accounts/Organization';

export type DistillTopicCommand = PackmindCommand & {
  topicId: TopicId;
  userId: string;
  organizationId: OrganizationId;
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
