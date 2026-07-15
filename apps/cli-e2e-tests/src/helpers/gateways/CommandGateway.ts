import {
  Gateway,
  ICaptureCommandUseCase,
  IUpdateCommandFromUIUseCase,
} from '@packmind/types';
import { ICommandGateway } from '../IPackmindGateway';
import { PackmindHttpClient } from './PackmindHttpClient';

export class CommandGateway implements ICommandGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  create: Gateway<ICaptureCommandUseCase> = async (command) => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/recipes`,
      { method: 'POST', body: command },
    );
  };

  update: Gateway<IUpdateCommandFromUIUseCase> = async (command) => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/recipes/${command.recipeId}`,
      { method: 'PATCH', body: command },
    );
  };
}
