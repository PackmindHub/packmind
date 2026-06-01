import { SkillFileId } from '@packmind/types';

export class SkillFileNotFoundError extends Error {
  constructor(skillFileId: SkillFileId) {
    super(`Skill file ${skillFileId} not found`);
    this.name = 'SkillFileNotFoundError';
  }
}
