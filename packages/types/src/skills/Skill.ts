import { SpaceId } from '../spaces/SpaceId';
import { SkillId } from './SkillId';

export type Skill = {
  id: SkillId;
  spaceId: SpaceId;
  name: string;
  version: number;
  description: string;
  prompt: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowedTools?: string;
};
