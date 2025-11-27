import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces';
import { StandardId } from '../StandardId';

export interface StandardUpdatedPayload {
  standardId: StandardId;
  spaceId: SpaceId;
  newVersion: number;
}

export class StandardUpdatedEvent extends UserEvent<StandardUpdatedPayload> {
  static override readonly eventName = 'standards.standard.updated';
}
