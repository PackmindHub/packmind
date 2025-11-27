import { UserEvent } from '../../events';
import { OrganizationId, UserId } from '../../accounts';
import { SpaceId } from '../../spaces';
import { StandardId } from '../StandardId';

export interface StandardCreatedPayload {
  standardId: StandardId;
  spaceId: SpaceId;
  organizationId: OrganizationId;
  userId: UserId;
  source: 'ui' | 'mcp';
}

export class StandardCreatedEvent extends UserEvent<StandardCreatedPayload> {
  static override readonly eventName = 'standards.standard.created';
}
