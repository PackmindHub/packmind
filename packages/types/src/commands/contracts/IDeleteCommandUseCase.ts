import { IUseCase, PackmindCommand, PackmindResult } from '../../UseCase';
import { CommandId } from '../CommandId';
import { SpaceId } from '../../spaces/SpaceId';

export type DeleteCommandCommand = PackmindCommand & {
  recipeId: CommandId;
  spaceId: SpaceId;
};

export type DeleteCommandResponse = PackmindResult;

export type IDeleteCommandUseCase = IUseCase<
  DeleteCommandCommand,
  DeleteCommandResponse
>;

export type DeleteCommandsBatchCommand = PackmindCommand & {
  recipeIds: CommandId[];
  spaceId: SpaceId;
};

export type DeleteCommandsBatchResponse = PackmindResult;

export type IDeleteCommandsBatchUseCase = IUseCase<
  DeleteCommandsBatchCommand,
  DeleteCommandsBatchResponse
>;
