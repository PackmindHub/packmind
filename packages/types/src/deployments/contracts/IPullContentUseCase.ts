import { IUseCase, PackmindCommand } from '../../UseCase';
import { FileUpdates } from '../FileUpdates';

export type IPullContentResponse = {
  fileUpdates: FileUpdates;
};

export type PullContentCommand = PackmindCommand & {
  packagesSlugs: string[];
};

export type IPullContentUseCase = IUseCase<
  PullContentCommand,
  IPullContentResponse
>;
