import {
  IRepository,
  SpaceId,
  SkillVersion,
  SkillId,
  SkillVersionId,
} from '@packmind/types';

export interface ISkillVersionRepository extends IRepository<SkillVersion> {
  findBySkillId(skillId: SkillId): Promise<SkillVersion[]>;
  findLatestBySkillId(skillId: SkillId): Promise<SkillVersion | null>;
  findLatestBySkillIds(skillIds: SkillId[]): Promise<SkillVersion[]>;
  findByIds(skillVersionIds: SkillVersionId[]): Promise<SkillVersion[]>;
  findBySkillIdAndVersion(
    skillId: SkillId,
    version: number,
    allowedSpaceIds: SpaceId[],
  ): Promise<SkillVersion | null>;
  updateMetadata(
    versionId: SkillVersionId,
    metadata: Record<string, string>,
  ): Promise<void>;
}
