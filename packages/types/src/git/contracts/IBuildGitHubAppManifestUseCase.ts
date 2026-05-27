import { IUseCase, PackmindCommand } from '../../UseCase';
import { GitHubAppManifest } from '../GitHubAppManifest';

export type BuildGitHubAppManifestCommand = PackmindCommand;

export type BuildGitHubAppManifestResponse = {
  manifest: GitHubAppManifest;
  state: string;
  manifestPostUrl: string;
};

export type IBuildGitHubAppManifestUseCase = IUseCase<
  BuildGitHubAppManifestCommand,
  BuildGitHubAppManifestResponse
>;
