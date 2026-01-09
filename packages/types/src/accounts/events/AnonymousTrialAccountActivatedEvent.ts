import { UserEvent } from '../../events';

export interface AnonymousTrialAccountActivatedPayload {
  email: string;
}

/**
 * Event emitted when a trial account is activated.
 */
export class AnonymousTrialAccountActivatedEvent extends UserEvent<AnonymousTrialAccountActivatedPayload> {
  static override readonly eventName = 'accounts.anonymous-trial.activated';
}
