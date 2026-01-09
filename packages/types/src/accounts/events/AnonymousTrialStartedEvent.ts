import { UserEvent } from '../../events';
import { StartTrialCommandAgents } from '../contracts';

export interface AnonymousTrialStartedPayload {
  agent: StartTrialCommandAgents;
  startedAt: Date;
}

/**
 * Event emitted when a user starts a trial.
 */
export class AnonymousTrialStartedEvent extends UserEvent<AnonymousTrialStartedPayload> {
  static override readonly eventName = 'accounts.anonymous-trial.started';
}
