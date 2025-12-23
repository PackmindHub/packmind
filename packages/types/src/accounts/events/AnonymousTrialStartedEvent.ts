import { PackmindEvent } from '../../events';
import { UserId } from '../User';
import { OrganizationId } from '../Organization';
import { StartTrialCommandAgents } from '../contracts';

export interface AnonymousTrialStartedPayload {
  userId: UserId;
  organizationId: OrganizationId;
  agent: StartTrialCommandAgents;
  startedAt: Date;
}

/**
 * Event emitted when a user starts a trial.
 */
export class AnonymousTrialStartedEvent extends PackmindEvent<AnonymousTrialStartedPayload> {
  static override readonly eventName = 'accounts.anonymous-trial.started';
}
