import { UserEvent } from '../../events';
import { SocialProvider } from '../SocialProvider';

export interface UserSignedInPayload {
  email: string;
  authType: 'password' | 'social';
  socialProvider?: SocialProvider;
}

/**
 * Event emitted when a user signs in.
 */
export class UserSignedInEvent extends UserEvent<UserSignedInPayload> {
  static override readonly eventName = 'accounts.user.signed-in';
}
