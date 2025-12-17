import { PackmindEvent } from '../../events';
import { UserId } from '../User';
import { OrganizationId } from '../Organization';
import { StartTrialCommand } from '../contracts';

export interface TrialStartedPayload {
  userId: UserId;
  organizationId: OrganizationId;
  agent: StartTrialCommand['agent'];
  startedAt: Date;
}

/**
 * Event emitted when a user starts a trial.
 */
export class TrialStartedEvent extends PackmindEvent<TrialStartedPayload> {
  static override readonly eventName = 'accounts.trial.started';
}
