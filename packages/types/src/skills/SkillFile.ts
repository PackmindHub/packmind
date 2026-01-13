import { SkillFileId } from './SkillFileId';
import { SkillVersionId } from './SkillVersionId';

export type SkillFile = {
  id: SkillFileId;
  skillVersionId: SkillVersionId;
  path: string;
  content: string;
  permissions: string;
  isBase64: boolean;
};
