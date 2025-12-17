import { PackmindEvent } from '../../events';
import { UserId } from '../User';
import { OrganizationId } from '../Organization';

export interface TrialAccountActivatedPayload {
  userId: UserId;
  organizationId: OrganizationId;
  email: string;
}

/**
 * Event emitted when a trial account is activated.
 */
export class TrialAccountActivatedEvent extends PackmindEvent<TrialAccountActivatedPayload> {
  static override readonly eventName = 'accounts.trial.activated';
}
