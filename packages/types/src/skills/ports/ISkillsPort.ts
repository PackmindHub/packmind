import { OrganizationId } from '../../accounts/Organization';
import { SpaceId } from '../../spaces/SpaceId';
import { Skill } from '../Skill';
import { SkillId } from '../SkillId';
import { SkillVersion } from '../SkillVersion';
import { SkillVersionId } from '../SkillVersionId';

export const ISkillsPortName = 'ISkillsPort' as const;

export interface ISkillsPort {
  getSkill(id: SkillId): Promise<Skill | null>;
  getSkillVersion(id: SkillVersionId): Promise<SkillVersion | null>;
  getLatestSkillVersion(skillId: SkillId): Promise<SkillVersion | null>;
  listSkillVersions(skillId: SkillId): Promise<SkillVersion[]>;
  listSkillsBySpace(
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: string,
  ): Promise<Skill[]>;
  findSkillBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Skill | null>;
}
