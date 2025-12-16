import { PackmindEvent } from '../../events';
import { UserId } from '../User';
import { OrganizationId } from '../Organization';
import { StartTrialCommand } from '../contracts';

export interface UserSignedUpPayload {
  userId: UserId;
  organizationId: OrganizationId;
  email: string;
  trialMode?: StartTrialCommand['agent'];
}

/**
 * Event emitted when a new user signs up and creates an organization.
 */
export class UserSignedUpEvent extends PackmindEvent<UserSignedUpPayload> {
  static override readonly eventName = 'accounts.user.signed_up';
}
