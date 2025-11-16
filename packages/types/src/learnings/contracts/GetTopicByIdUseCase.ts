import { IUseCase, PackmindCommand } from '../../UseCase';
import { SpaceId } from '../../spaces/SpaceId';
import { Topic } from '../Topic';
import { TopicId } from '../TopicId';

export type GetTopicByIdCommand = PackmindCommand & {
  spaceId: SpaceId;
  topicId: TopicId;
};

export type GetTopicByIdResponse = {
  topic: Topic | null;
};

export type IGetTopicByIdUseCase = IUseCase<
  GetTopicByIdCommand,
  GetTopicByIdResponse
>;
