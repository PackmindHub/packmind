import { ISkillsGateway } from '../IPackmindGateway';
import { PackmindHttpClient } from './PackmindHttpClient';
import {
  CreateSkillResponse,
  Gateway,
  ICreateSkillUseCase,
} from '@packmind/types';

export class SkillsGateway implements ISkillsGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  create: Gateway<ICreateSkillUseCase> = async (params) => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request<CreateSkillResponse>(
      `/api/v0/organizations/${organizationId}/spaces-management`,
      { method: 'POST', body: params },
    );
  };
}
