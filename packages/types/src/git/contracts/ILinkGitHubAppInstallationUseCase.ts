import { IUseCase, PackmindCommand } from '../../UseCase';
import { GitProvider } from '../GitProvider';

export type LinkGitHubAppInstallationCommand = PackmindCommand & {
  installationId: number;
};

export type InstallationAccount = {
  login: string;
  type: string;
  targetType: string;
  repositorySelection: string;
};

export type LinkGitHubAppInstallationResponse = {
  gitProvider: GitProvider;
  installationAccount: InstallationAccount;
};

export type ILinkGitHubAppInstallationUseCase = IUseCase<
  LinkGitHubAppInstallationCommand,
  LinkGitHubAppInstallationResponse
>;
