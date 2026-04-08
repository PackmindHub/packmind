import { UserEvent } from '../../events';
import { SpaceId } from '../SpaceId';
import { UserId } from '../../accounts/User';

export interface SpaceMembersRemovedPayload {
  spaceId: SpaceId;
  memberUserIds: UserId[];
}

export class SpaceMembersRemovedEvent extends UserEvent<SpaceMembersRemovedPayload> {
  static override readonly eventName = 'spaces.space.members-removed';
}
