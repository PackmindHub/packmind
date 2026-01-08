import { IRepository, SkillVersion, SkillId } from '@packmind/types';

export interface ISkillVersionRepository extends IRepository<SkillVersion> {
  findBySkillId(skillId: SkillId): Promise<SkillVersion[]>;
  findLatestBySkillId(skillId: SkillId): Promise<SkillVersion | null>;
  findBySkillIdAndVersion(
    skillId: SkillId,
    version: number,
  ): Promise<SkillVersion | null>;
  updateMetadata(
    versionId: string,
    metadata: Record<string, string>,
  ): Promise<void>;
}
