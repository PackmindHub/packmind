import {
  IRepository,
  SkillVersion,
  SkillId,
  SkillVersionId,
} from '@packmind/types';

export interface ISkillVersionRepository extends IRepository<SkillVersion> {
  findBySkillId(skillId: SkillId): Promise<SkillVersion[]>;
  findLatestBySkillId(skillId: SkillId): Promise<SkillVersion | null>;
  findBySkillIdAndVersion(
    skillId: SkillId,
    version: number,
  ): Promise<SkillVersion | null>;
  updateMetadata(
    versionId: SkillVersionId,
    metadata: Record<string, string>,
  ): Promise<void>;
}
