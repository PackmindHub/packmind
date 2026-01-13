import { UserId } from '../accounts/User';
import { SpaceId } from '../spaces/SpaceId';
import { SkillId } from './SkillId';

export type Skill = {
  id: SkillId;
  spaceId: SpaceId;
  userId: UserId;
  name: string;
  slug: string;
  version: number;
  description: string;
  prompt: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowedTools?: string;
  createdAt: Date;
  updatedAt: Date;
};
