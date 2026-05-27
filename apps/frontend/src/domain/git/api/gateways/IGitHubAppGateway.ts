import {
  GitHubAppManifest,
  GitHubAppConfigSummary,
  GitProviderId,
  GetGitHubAppStatusResponse,
  LinkGitHubAppInstallationResponse,
  UnlinkGitHubAppInstallationResponse,
  ListInstallationRepositoriesResponse,
} from '@packmind/types';

export interface IGitHubAppGateway {
  getManifest(): Promise<{
    manifest: GitHubAppManifest;
    state: string;
    manifestPostUrl: string;
  }>;

  registerFromManifest(
    code: string,
    state: string,
  ): Promise<GitHubAppConfigSummary>;

  getStatus(): Promise<GetGitHubAppStatusResponse>;

  linkInstallation(
    installationId: number,
  ): Promise<LinkGitHubAppInstallationResponse>;

  unlinkInstallation(): Promise<UnlinkGitHubAppInstallationResponse>;

  listInstallationRepositories(
    gitProviderId: GitProviderId,
  ): Promise<ListInstallationRepositoriesResponse>;
}
