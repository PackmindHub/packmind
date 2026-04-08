import { UserEvent } from '../../events';
import { SpaceId } from '../SpaceId';
import { UserId } from '../../accounts/User';
import { UserSpaceRole } from '../UserSpaceMembership';

export interface SpaceMembersRoleUpdatedPayload {
  spaceId: SpaceId;
  memberUserIds: UserId[];
  newRole: UserSpaceRole;
}

export class SpaceMembersRoleUpdatedEvent extends UserEvent<SpaceMembersRoleUpdatedPayload> {
  static override readonly eventName = 'spaces.space.members-role-updated';
}
