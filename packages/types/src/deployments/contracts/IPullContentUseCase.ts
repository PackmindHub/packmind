import { IUseCase, PackmindCommand } from '../../UseCase';
import { FileUpdates } from '../FileUpdates';

export type IPullContentResponse = {
  fileUpdates: FileUpdates;
};

export type PullContentCommand = PackmindCommand & {
  packagesSlugs: string[];
  previousPackagesSlugs?: string[]; // Previously installed packages for change detection
};

export type IPullContentUseCase = IUseCase<
  PullContentCommand,
  IPullContentResponse
>;
