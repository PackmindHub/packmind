import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces';
import { SkillId } from '../SkillId';

export interface SkillUpdatedPayload {
  skillId: SkillId;
  spaceId: SpaceId;
  source: 'ui' | 'mcp' | 'cli';
  fileCount: number;
}

export class SkillUpdatedEvent extends UserEvent<SkillUpdatedPayload> {
  static override readonly eventName = 'skills.skill.updated';
}
