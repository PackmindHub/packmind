import { UserEvent } from '../../events';

export interface SpaceCreatedPayload {
  spaceName: string;
  spaceSlug: string;
}

export class SpaceCreatedEvent extends UserEvent<SpaceCreatedPayload> {
  static override readonly eventName = 'spaces.space.created';
}
