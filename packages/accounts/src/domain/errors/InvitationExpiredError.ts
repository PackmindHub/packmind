import { AccountsError } from './AccountsError';

export class InvitationExpiredError extends AccountsError {
  constructor() {
    super('not_found', 'invitation_expired', {}, 'Invitation has expired');
    this.name = 'InvitationExpiredError';
  }
}
