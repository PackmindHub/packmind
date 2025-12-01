import { PackmindEvent } from '../../events';
import { UserId } from '../User';
import { OrganizationId } from '../Organization';

export interface UserJoinedOrganizationPayload {
  userId: UserId;
  organizationId: OrganizationId;
  email: string;
}

/**
 * Event emitted when an invited user activates their account and joins an organization.
 */
export class UserJoinedOrganizationEvent extends PackmindEvent<UserJoinedOrganizationPayload> {
  static override readonly eventName = 'accounts.user.joined_organization';
}
