import { PackmindHttpClient } from './PackmindHttpClient';
import { Gateway, IGetTargetsByOrganizationUseCase } from '@packmind/types';
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
}
