import { OrganizationId } from '../../accounts/Organization';
import type { QueryOption } from '../../database/types';
import { SpaceId } from '../../spaces/SpaceId';
import { Skill } from '../Skill';
import { SkillFile } from '../SkillFile';
import { SkillId } from '../SkillId';
import { SkillVersion } from '../SkillVersion';
import { SkillVersionId } from '../SkillVersionId';
import { SaveSkillVersionCommand } from '../contracts/SaveSkillVersionUseCase';

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
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Skill[]>;
  findSkillBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Skill | null>;
  getSkillFiles(skillVersionId: SkillVersionId): Promise<SkillFile[]>;
  saveSkillVersion(command: SaveSkillVersionCommand): Promise<SkillVersion>;
}
