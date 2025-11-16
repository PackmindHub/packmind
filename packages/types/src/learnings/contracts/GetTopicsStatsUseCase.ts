import { IUseCase, PackmindCommand } from '../../UseCase';
import { SpaceId } from '../../spaces/SpaceId';

export type GetTopicsStatsCommand = PackmindCommand & {
  spaceId: SpaceId;
};

export type GetTopicsStatsResponse = {
  totalTopics: number;
  pendingTopics: number;
};

export type IGetTopicsStatsUseCase = IUseCase<
  GetTopicsStatsCommand,
  GetTopicsStatsResponse
>;
