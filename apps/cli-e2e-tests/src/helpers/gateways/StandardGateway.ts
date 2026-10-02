import {
  Gateway,
  ICreateStandardUseCase,
  IListStandardsBySpaceUseCase,
  IUpdateStandardUseCase,
  Standard,
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

    // Dumb API which does not fulfill the use case specification...
    const standard = await this.httpClient.request<Standard>(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/standards`,
      { method: 'POST', body: command },
    );

    return { standard };
  };

  update: Gateway<IUpdateStandardUseCase> = async (command) => {
    const organizationId = this.httpClient.getOrganizationId();
    const { spaceId, standardId, name, description, rules, scope } = command;

    // Same as create: the API answers with the bare standard.
    const standard = await this.httpClient.request<Standard>(
      `/api/v0/organizations/${organizationId}/spaces/${spaceId}/standards/${standardId}`,
      { method: 'POST', body: { name, description, rules, scope } },
    );

    return { standard };
  };
}
