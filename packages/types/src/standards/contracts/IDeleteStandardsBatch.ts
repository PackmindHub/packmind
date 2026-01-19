import { IUseCase, PackmindCommand, PackmindResult } from '../../UseCase';
import { StandardId } from '../StandardId';

export type DeleteStandardsBatchCommand = PackmindCommand & {
  standardIds: StandardId[];
};

export type DeleteStandardsBatchResponse = PackmindResult;

export type IDeleteStandardsBatchUseCase = IUseCase<
  DeleteStandardsBatchCommand,
  DeleteStandardsBatchResponse
>;
