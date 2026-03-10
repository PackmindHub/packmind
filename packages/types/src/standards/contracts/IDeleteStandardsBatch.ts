import { IUseCase, PackmindCommand, PackmindResult } from '../../UseCase';
import { SpaceId } from '../../spaces/SpaceId';
import { StandardId } from '../StandardId';

export type DeleteStandardsBatchCommand = PackmindCommand & {
  standardIds: StandardId[];
  spaceId: SpaceId;
};

export type DeleteStandardsBatchResponse = PackmindResult;

export type IDeleteStandardsBatchUseCase = IUseCase<
  DeleteStandardsBatchCommand,
  DeleteStandardsBatchResponse
>;
