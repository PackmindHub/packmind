import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces';
import { StandardId } from '../StandardId';

export interface StandardCreatedPayload {
  standardId: StandardId;
  spaceId: SpaceId;
  source: 'ui' | 'mcp';
}

export class StandardCreatedEvent extends UserEvent<StandardCreatedPayload> {
  static override readonly eventName = 'standards.standard.created';
}
