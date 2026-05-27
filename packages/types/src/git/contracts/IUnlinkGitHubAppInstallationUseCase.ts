import { IUseCase, PackmindCommand } from '../../UseCase';

export type UnlinkGitHubAppInstallationCommand = PackmindCommand;

export type UnlinkGitHubAppInstallationResponse = {
  unlinked: boolean;
};

export type IUnlinkGitHubAppInstallationUseCase = IUseCase<
  UnlinkGitHubAppInstallationCommand,
  UnlinkGitHubAppInstallationResponse
>;
