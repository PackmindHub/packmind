import { UserEvent } from '../../events';
import { SpaceId } from '../SpaceId';
import { SpaceType } from '../Space';

export interface SpaceVisibilityUpdatedPayload {
  spaceId: SpaceId;
  newVisibility: SpaceType;
}

export class SpaceVisibilityUpdatedEvent extends UserEvent<SpaceVisibilityUpdatedPayload> {
  static override readonly eventName = 'spaces.space.visibility-updated';
}
