import { IUseCase, PackmindCommand, PackmindResult } from '../../UseCase';
import { StandardId } from '../StandardId';

export type DeleteStandardCommand = PackmindCommand & {
  standardId: StandardId;
};

export type DeleteStandardResponse = PackmindResult;

export type IDeleteStandardUseCase = IUseCase<
  DeleteStandardCommand,
  DeleteStandardResponse
>;
