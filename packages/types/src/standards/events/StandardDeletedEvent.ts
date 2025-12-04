import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces';
import { StandardId } from '../StandardId';

export interface StandardDeletedPayload {
  standardId: StandardId;
  spaceId: SpaceId;
}

export class StandardDeletedEvent extends UserEvent<StandardDeletedPayload> {
  static override readonly eventName = 'standards.standard.deleted';
}
