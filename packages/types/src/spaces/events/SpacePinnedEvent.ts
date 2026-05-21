import { UserEvent } from '../../events';
import { SpaceId } from '../SpaceId';

export interface SpacePinnedPayload {
  spaceId: SpaceId;
}

export class SpacePinnedEvent extends UserEvent<SpacePinnedPayload> {
  static override readonly eventName = 'spaces.space.pinned';
}
