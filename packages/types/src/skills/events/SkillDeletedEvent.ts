import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces';
import { SkillId } from '../SkillId';

export interface SkillDeletedPayload {
  skillId: SkillId;
  spaceId: SpaceId;
}

export class SkillDeletedEvent extends UserEvent<SkillDeletedPayload> {
  static override readonly eventName = 'skills.skill.deleted';
}
