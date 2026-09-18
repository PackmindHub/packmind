import { UserEvent } from '../../events';

export interface UserJoinedOrganizationPayload {
  email: string;
}

/** Emitted on invitation acceptance, not on the signup that creates an org. */
export class UserJoinedOrganizationEvent extends UserEvent<UserJoinedOrganizationPayload> {
  static override readonly eventName = 'accounts.user.joined-organization';
}
