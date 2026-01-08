import { OrganizationId, Skill, SpaceId } from '@packmind/types';

export interface ISkillsGateway {
  getSkills(organizationId: OrganizationId, spaceId: SpaceId): Promise<Skill[]>;
}
