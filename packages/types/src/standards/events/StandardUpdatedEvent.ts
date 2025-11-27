import { UserEvent } from '../../events';
import { OrganizationId, UserId } from '../../accounts';
import { SpaceId } from '../../spaces';
import { StandardId } from '../StandardId';

export interface StandardUpdatedPayload {
  standardId: StandardId;
  spaceId: SpaceId;
  organizationId: OrganizationId;
  userId: UserId;
  newVersion: number;
}

export class StandardUpdatedEvent extends UserEvent<StandardUpdatedPayload> {
  static override readonly eventName = 'standards.standard.updated';
}
