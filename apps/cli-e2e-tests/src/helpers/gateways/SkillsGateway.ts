import { ISkillsGateway } from '../IPackmindGateway';
import { PackmindHttpClient } from './PackmindHttpClient';
import {
  Gateway,
  IUploadSkillUseCase,
  UploadSkillResponse,
} from '@packmind/types';

export class SkillsGateway implements ISkillsGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  upload: Gateway<IUploadSkillUseCase> = async (params) => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request<UploadSkillResponse>(
      `/api/v0//organizations/${organizationId}/spaces/${params.spaceId}/skills/upload`,
      { method: 'POST', body: params },
    );
  };
}
