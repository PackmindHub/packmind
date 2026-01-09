import { UserEvent } from '../../events';

export interface UserJoinedOrganizationPayload {
  email: string;
}

/**
 * Event emitted when an invited user activates their account and joins an organization.
 */
export class UserJoinedOrganizationEvent extends UserEvent<UserJoinedOrganizationPayload> {
  static override readonly eventName = 'accounts.user.joined-organization';
}
