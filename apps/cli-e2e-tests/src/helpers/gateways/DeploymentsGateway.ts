import { PackmindHttpClient } from './PackmindHttpClient';
import {
  Gateway,
  IGetTargetsByOrganizationUseCase,
  IUpdateRenderModeConfigurationUseCase,
  Distribution,
} from '@packmind/types';
import { IDeploymentsGateway } from '../IPackmindGateway';

export class DeploymentsGateway implements IDeploymentsGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  getTargetsByOrganization: Gateway<IGetTargetsByOrganizationUseCase> =
    async () => {
      const organizationId = this.httpClient.getOrganizationId();
      return this.httpClient.request(
        `/api/v0/organizations/${organizationId}/deployments/targets`,
      );
    };

  updateRenderModeConfiguration: Gateway<IUpdateRenderModeConfigurationUseCase> =
    async (command) => {
      const organizationId = this.httpClient.getOrganizationId();
      return this.httpClient.request(
        `/api/v0/organizations/${organizationId}/deployments/renderModeConfiguration`,
        {
          method: 'POST',
          body: { activeRenderModes: command.activeRenderModes },
        },
      );
    };

  listDeploymentsByPackage = async (
    packageId: string,
  ): Promise<Distribution[]> => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/deployments/package/${packageId}`,
    );
  };
}
