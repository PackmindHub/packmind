import { IUseCase, PackmindCommand, PackmindResult } from '../../UseCase';
import { SpaceId } from '../../spaces/SpaceId';
import { StandardId } from '../StandardId';

export type DeleteStandardCommand = PackmindCommand & {
  standardId: StandardId;
  spaceId: SpaceId;
};

export type DeleteStandardResponse = PackmindResult;

export type IDeleteStandardUseCase = IUseCase<
  DeleteStandardCommand,
  DeleteStandardResponse
>;
