import { OrganizationId, Skill, SpaceId } from '@packmind/types';
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
}
