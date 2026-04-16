import { UserEvent } from '../../events';
import { SpaceId } from '../SpaceId';

export interface SpaceUnpinnedPayload {
  spaceId: SpaceId;
}

export class SpaceUnpinnedEvent extends UserEvent<SpaceUnpinnedPayload> {
  static override readonly eventName = 'spaces.space.unpinned';
}
