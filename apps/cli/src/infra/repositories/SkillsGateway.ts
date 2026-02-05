import {
  Gateway,
  IDeployDefaultSkillsUseCase,
  IListSkillsBySpaceUseCase,
  IUploadSkillUseCase,
} from '@packmind/types';
import { ISkillsGateway } from '../../domain/repositories/ISkillsGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';

export class SkillsGateway implements ISkillsGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  public upload: Gateway<IUploadSkillUseCase> = async (command) => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/skills/upload`,
      {
        method: 'POST',
        body: command,
      },
    );
  };

  public getDefaults: Gateway<IDeployDefaultSkillsUseCase> = async (
    command,
  ) => {
    const { organizationId } = this.httpClient.getAuthContext();
    const queryParams = new URLSearchParams();
    if (command.includeBeta) {
      queryParams.set('includeBeta', 'true');
    } else if (command.cliVersion) {
      queryParams.set('cliVersion', command.cliVersion);
    }

    // Add agents from packmind.json config
    // When agents is defined (even if empty), signal to API that user explicitly configured agents
    if (command.agents !== undefined) {
      queryParams.append('agentsConfigOverride', 'true');
      command.agents.forEach((agent) => {
        queryParams.append('agent', agent);
      });
    }

    const queryString = queryParams.toString();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/skills/default${queryString ? `?${queryString}` : ''}`,
    );
  };

  public list: Gateway<IListSkillsBySpaceUseCase> = async (command) => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/skills`,
    );
  };
}
