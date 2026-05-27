import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IGitHubAppGateway } from './IGitHubAppGateway';
import {
  GitHubAppManifest,
  GitHubAppConfigSummary,
  GitProviderId,
  GetGitHubAppStatusResponse,
  LinkGitHubAppInstallationResponse,
  UnlinkGitHubAppInstallationResponse,
  ListInstallationRepositoriesResponse,
} from '@packmind/types';

export class GitHubAppGatewayApi
  extends PackmindGateway
  implements IGitHubAppGateway
{
  constructor() {
    super('/integrations/github-app');
  }

  async getManifest(): Promise<{
    manifest: GitHubAppManifest;
    state: string;
    manifestPostUrl: string;
  }> {
    return this._api.get(`${this._endpoint}/manifest`);
  }

  async registerFromManifest(
    code: string,
    state: string,
  ): Promise<GitHubAppConfigSummary> {
    return this._api.post(`${this._endpoint}/manifest-callback`, {
      code,
      state,
    });
  }

  async getStatus(): Promise<GetGitHubAppStatusResponse> {
    return this._api.get(`${this._endpoint}/status`);
  }

  async linkInstallation(
    installationId: number,
  ): Promise<LinkGitHubAppInstallationResponse> {
    return this._api.post(`${this._endpoint}/install-callback`, {
      installationId,
    });
  }

  async unlinkInstallation(): Promise<UnlinkGitHubAppInstallationResponse> {
    return this._api.delete(`${this._endpoint}/installations/me`);
  }

  async listInstallationRepositories(
    gitProviderId: GitProviderId,
  ): Promise<ListInstallationRepositoriesResponse> {
    return this._api.get(
      `${this._endpoint}/providers/${gitProviderId}/repositories`,
    );
  }
}
