import { SkillVersionId } from './SkillVersionId';
import { SkillId } from './SkillId';
import { UserId } from '../accounts/User';

export type SkillVersion = {
  id: SkillVersionId;
  skillId: SkillId;
  version: number;
  userId: UserId;
  name: string;
  slug: string;
  description: string;
  prompt: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowedTools?: string;
};
