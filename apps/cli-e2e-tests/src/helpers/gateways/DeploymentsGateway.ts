import { PackmindHttpClient } from './PackmindHttpClient';
import { Gateway, IGetTargetsByOrganizationUseCase } from '@packmind/types';

export interface IDeploymentsGateway {
  getTargetsByOrganization: Gateway<IGetTargetsByOrganizationUseCase>;
}

export class DeploymentsGateway implements IDeploymentsGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  getTargetsByOrganization: Gateway<IGetTargetsByOrganizationUseCase> =
    async () => {
      const organizationId = this.httpClient.getOrganizationId();
      return this.httpClient.request(
        `/api/v0/organizations/${organizationId}/deployments/targets`,
      );
    };
}
