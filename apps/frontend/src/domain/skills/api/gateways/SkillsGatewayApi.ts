import {
  OrganizationId,
  Skill,
  SkillId,
  SkillVersion,
  SkillWithFiles,
  SpaceId,
} from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { ISkillsGateway } from './ISkillsGateway';

export class SkillsGatewayApi
  extends PackmindGateway
  implements ISkillsGateway
{
  constructor() {
    super('/skills');
  }

  async getSkills(
    organizationId: OrganizationId,
    spaceId: SpaceId,
  ): Promise<Skill[]> {
    return this._api.get<Skill[]>(
      `/organizations/${organizationId}/spaces/${spaceId}/skills`,
    );
  }

  async getSkillBySlug(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    slug: string,
  ): Promise<SkillWithFiles | null> {
    return this._api.get<SkillWithFiles | null>(
      `/organizations/${organizationId}/spaces/${spaceId}/skills/${slug}`,
    );
  }

  async getSkillVersions(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    skillId: SkillId,
  ): Promise<SkillVersion[]> {
    return this._api.get<SkillVersion[]>(
      `/organizations/${organizationId}/spaces/${spaceId}/skills/${skillId}/versions`,
    );
  }
}
