import { UserEvent } from '../../events';
import { SpaceId } from '../SpaceId';
import { UserId } from '../../accounts/User';

export interface SpaceMembersAddedPayload {
  spaceId: SpaceId;
  memberUserIds: UserId[];
}

export class SpaceMembersAddedEvent extends UserEvent<SpaceMembersAddedPayload> {
  static override readonly eventName = 'spaces.space.members-added';
}
