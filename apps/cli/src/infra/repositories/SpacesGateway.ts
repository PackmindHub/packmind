import {
  ISpacesGateway,
  GetGlobalSpaceResult,
} from '../../domain/repositories/ISpacesGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';

export class SpacesGateway implements ISpacesGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  getGlobal = async (): Promise<GetGlobalSpaceResult> => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<GetGlobalSpaceResult>(
      `/api/v0/organizations/${organizationId}/spaces/global`,
    );
  };
}
