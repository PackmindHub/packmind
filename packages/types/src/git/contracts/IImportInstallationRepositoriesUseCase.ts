import { IUseCase, PackmindCommand } from '../../UseCase';
import { GitProviderId } from '../GitProvider';

export type ImportInstallationRepositoriesCommand = PackmindCommand & {
  gitProviderId: GitProviderId;
};

export type ImportInstallationRepositoriesResponse = {
  importedCount: number;
  skippedCount: number;
};

export type IImportInstallationRepositoriesUseCase = IUseCase<
  ImportInstallationRepositoriesCommand,
  ImportInstallationRepositoriesResponse
>;
