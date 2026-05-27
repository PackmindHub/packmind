import { IUseCase, PackmindCommand } from '../../UseCase';
import { GitHubAppConfigSummary } from '../GitHubAppConfig';

export type RegisterGitHubAppFromManifestCommand = PackmindCommand & {
  code: string;
  state: string;
};

export type RegisterGitHubAppFromManifestResponse = GitHubAppConfigSummary;

export type IRegisterGitHubAppFromManifestUseCase = IUseCase<
  RegisterGitHubAppFromManifestCommand,
  RegisterGitHubAppFromManifestResponse
>;
