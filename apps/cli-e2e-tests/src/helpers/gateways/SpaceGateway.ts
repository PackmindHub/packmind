import { Space, SpaceType } from '@packmind/types';
import { ISpaceGateway } from '../IPackmindGateway';
import { PackmindHttpClient } from './PackmindHttpClient';

export class SpaceGateway implements ISpaceGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  getGlobal = async (): Promise<Space> => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request<Space>(
      `/api/v0/organizations/${organizationId}/spaces/global`,
    );
  };

  create = async (params: {
    name: string;
    type?: SpaceType;
  }): Promise<Space> => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request<Space>(
      `/api/v0/organizations/${organizationId}/spaces-management`,
      { method: 'POST', body: params },
    );
  };
}
