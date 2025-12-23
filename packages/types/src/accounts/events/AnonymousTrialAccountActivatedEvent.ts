import { PackmindEvent } from '../../events';
import { UserId } from '../User';
import { OrganizationId } from '../Organization';

export interface AnonymousTrialAccountActivatedPayload {
  userId: UserId;
  organizationId: OrganizationId;
  email: string;
}

/**
 * Event emitted when a trial account is activated.
 */
export class AnonymousTrialAccountActivatedEvent extends PackmindEvent<AnonymousTrialAccountActivatedPayload> {
  static override readonly eventName = 'accounts.anonymous-trial.activated';
}
