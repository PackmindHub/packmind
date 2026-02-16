import { SkillId } from '@packmind/types';

export class SkillVersionNotFoundError extends Error {
  constructor(skillId: SkillId) {
    super(`No version found for skill ${skillId}`);
    this.name = 'SkillVersionNotFoundError';
  }
}
