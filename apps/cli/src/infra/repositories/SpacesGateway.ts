import { ISpacesGateway } from '../../domain/repositories/ISpacesGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import { ListUserSpacesResponse } from '@packmind/types';

export class SpacesGateway implements ISpacesGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}
  getUserSpaces = async () => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<ListUserSpacesResponse>(
      `/api/v0/organizations/${organizationId}/user-spaces`,
    );
  };
}
