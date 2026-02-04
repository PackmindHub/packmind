import {
  Gateway,
  IDeployDefaultSkillsUseCase,
  IListSkillsBySpaceUseCase,
  IUploadSkillUseCase,
} from '@packmind/types';
import {
  ISkillsGateway,
  ListedSkill,
} from '../../domain/repositories/ISkillsGateway';
import { ISpacesGateway } from '../../domain/repositories/ISpacesGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';

export class SkillsGateway implements ISkillsGateway {
  constructor(
    private readonly httpClient: PackmindHttpClient,
    private readonly spaces: ISpacesGateway,
  ) {}

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

  public getBySlug = async (slug: string): Promise<ListedSkill | null> => {
    const space = await this.spaces.getGlobal();
    const skills = await this.list({ spaceId: space.id });
    const skill = skills.find((s) => s.slug === slug);
    return skill ? { id: skill.id, slug: skill.slug, name: skill.name } : null;
  };
}
