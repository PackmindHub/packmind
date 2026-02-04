import { ISpacesGateway } from '../../domain/repositories/ISpacesGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import { Space } from '@packmind/types';

export class SpacesGateway implements ISpacesGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  getGlobal = async () => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<Space>(
      `/api/v0/organizations/${organizationId}/spaces/global`,
    );
  };
}
