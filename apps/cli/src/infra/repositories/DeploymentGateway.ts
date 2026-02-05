import {
  Gateway,
  INotifyDistributionUseCase,
  IPullContentUseCase,
} from '@packmind/types';
import { IDeploymentGateway } from '../../domain/repositories/IDeploymentGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';

export class DeploymentGateway implements IDeploymentGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  public pull: Gateway<IPullContentUseCase> = async (command) => {
    const { organizationId } = this.httpClient.getAuthContext();

    // Build query parameters for package slugs
    const queryParams = new URLSearchParams();
    if (command.packagesSlugs && command.packagesSlugs.length > 0) {
      command.packagesSlugs.forEach((slug) => {
        queryParams.append('packageSlug', slug);
      });
    }

    // Add previous package slugs for change detection
    if (
      command.previousPackagesSlugs &&
      command.previousPackagesSlugs.length > 0
    ) {
      command.previousPackagesSlugs.forEach((slug) => {
        queryParams.append('previousPackageSlug', slug);
      });
    }

    // Add git target info for distribution history lookup
    if (command.gitRemoteUrl) {
      queryParams.append('gitRemoteUrl', command.gitRemoteUrl);
    }
    if (command.gitBranch) {
      queryParams.append('gitBranch', command.gitBranch);
    }
    if (command.relativePath) {
      queryParams.append('relativePath', command.relativePath);
    }

    // Add agents from packmind.json config
    if (command.agents && command.agents.length > 0) {
      command.agents.forEach((agent) => {
        queryParams.append('agent', agent);
      });
    }

    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/pull?${queryParams.toString()}`,
    );
  };

  public notifyDistribution: Gateway<INotifyDistributionUseCase> = async (
    command,
  ) => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/deployments`,
      {
        method: 'POST',
        body: command,
      },
    );
  };
}
