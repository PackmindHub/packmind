import { UserEvent } from '../../events';
import { SpaceId } from '../SpaceId';

export interface SpaceDeletedPayload {
  spaceId: SpaceId;
  spaceName: string;
  spaceSlug: string;
}

export class SpaceDeletedEvent extends UserEvent<SpaceDeletedPayload> {
  static override readonly eventName = 'spaces.space.deleted';
}
