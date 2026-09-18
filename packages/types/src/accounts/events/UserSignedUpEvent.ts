import { UserEvent } from '../../events';

export interface UserSignedUpPayload {
  email: string;
  quickStart: boolean;
  method: string;
  socialProvider?: string;
}

export class UserSignedUpEvent extends UserEvent<UserSignedUpPayload> {
  static override readonly eventName = 'accounts.user.signed-up';
}
