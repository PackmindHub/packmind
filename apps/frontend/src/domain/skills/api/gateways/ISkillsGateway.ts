import {
  OrganizationId,
  Skill,
  SkillId,
  SkillVersion,
  SkillWithFiles,
  SpaceId,
} from '@packmind/types';

export interface ISkillsGateway {
  getSkills(organizationId: OrganizationId, spaceId: SpaceId): Promise<Skill[]>;
  getSkillBySlug(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    slug: string,
  ): Promise<SkillWithFiles | null>;
  getSkillVersions(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    skillId: SkillId,
  ): Promise<SkillVersion[]>;
  deleteSkill(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    skillId: SkillId,
  ): Promise<void>;
}
