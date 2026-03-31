import {
  Gateway,
  ICreateStandardUseCase,
  IListStandardsBySpaceUseCase,
} from '@packmind/types';
import { IStandardGateway } from '../IPackmindGateway';
import { PackmindHttpClient } from './PackmindHttpClient';

export class StandardGateway implements IStandardGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}
  list: Gateway<IListStandardsBySpaceUseCase> = async (command) => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/standards`,
      { method: 'GET' },
    );
  };

  create: Gateway<ICreateStandardUseCase> = async (command) => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/standards`,
      { method: 'POST', body: command },
    );
  };
}
