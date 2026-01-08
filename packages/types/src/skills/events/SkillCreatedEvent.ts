import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces';
import { SkillId } from '../SkillId';

export interface SkillCreatedPayload {
  skillId: SkillId;
  spaceId: SpaceId;
  source: 'ui' | 'mcp';
}

export class SkillCreatedEvent extends UserEvent<SkillCreatedPayload> {
  static override readonly eventName = 'skills.skill.created';
}
