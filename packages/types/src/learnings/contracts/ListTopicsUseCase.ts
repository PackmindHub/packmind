import { IUseCase, PackmindCommand } from '../../UseCase';
import { SpaceId } from '../../spaces/SpaceId';
import { Topic } from '../Topic';

export type ListTopicsCommand = PackmindCommand & {
  spaceId: SpaceId;
};

export type ListTopicsResponse = {
  topics: Topic[];
};

export type IListTopicsUseCase = IUseCase<
  ListTopicsCommand,
  ListTopicsResponse
>;
