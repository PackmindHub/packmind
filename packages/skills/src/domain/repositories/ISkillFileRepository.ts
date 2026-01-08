import { IRepository, SkillFile, SkillVersionId } from '@packmind/types';

export interface ISkillFileRepository extends IRepository<SkillFile> {
  findBySkillVersionId(skillVersionId: SkillVersionId): Promise<SkillFile[]>;
  addMany(files: SkillFile[]): Promise<SkillFile[]>;
}
