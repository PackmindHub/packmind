import { PackmindEvent } from '../../events';
import { UserId } from '../User';
import { OrganizationId } from '../Organization';

export interface UserSignedUpPayload {
  userId: UserId;
  organizationId: OrganizationId;
  email: string;
}

/**
 * Event emitted when a new user signs up and creates an organization.
 */
export class UserSignedUpEvent extends PackmindEvent<UserSignedUpPayload> {
  static override readonly eventName = 'accounts.user.signed_up';
}
