import { IUseCase, PackmindCommand } from '../../UseCase';
import { FileUpdates } from '../FileUpdates';

export type IPullAllContentResponse = {
  fileUpdates: FileUpdates;
};

export type IPullAllContentUseCase = IUseCase<
  PackmindCommand,
  IPullAllContentResponse
>;
