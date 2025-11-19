import { IUseCase, PackmindCommand } from '../../UseCase';
import { SpaceId } from '../../spaces/SpaceId';
import { TopicId } from '../TopicId';

export type DeleteTopicsCommand = PackmindCommand & {
  topicIds: TopicId[];
  spaceId: SpaceId;
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type DeleteTopicsResponse = {};

export type IDeleteTopicsUseCase = IUseCase<
  DeleteTopicsCommand,
  DeleteTopicsResponse
>;
