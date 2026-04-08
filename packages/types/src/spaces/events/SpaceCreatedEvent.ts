import { UserEvent } from '../../events';
import { SpaceType } from '../Space';

export interface SpaceCreatedPayload {
  spaceName: string;
  spaceSlug: string;
  visibility: SpaceType;
}

export class SpaceCreatedEvent extends UserEvent<SpaceCreatedPayload> {
  static override readonly eventName = 'spaces.space.created';
}
