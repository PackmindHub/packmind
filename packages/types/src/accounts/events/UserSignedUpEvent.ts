import { UserEvent } from '../../events';

export interface UserSignedUpPayload {
  email: string;
  quickStart: boolean;
}

/**
 * Event emitted when a new user signs up and creates an organization.
 */
export class UserSignedUpEvent extends UserEvent<UserSignedUpPayload> {
  static override readonly eventName = 'accounts.user.signed-up';
}
