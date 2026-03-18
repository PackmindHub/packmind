import { Gateway, ICreateStandardUseCase } from '@packmind/types';
import { IStandardGateway } from '../IPackmindGateway';
import { PackmindHttpClient } from './PackmindHttpClient';

export class StandardGateway implements IStandardGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  create: Gateway<ICreateStandardUseCase> = async (command) => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/standards`,
      { method: 'POST', body: command },
    );
  };
}
